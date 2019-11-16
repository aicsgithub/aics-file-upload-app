import Logger from "js-logger";
import { forEach, includes, isEmpty, isNil, map, trim, values } from "lodash";
import { Moment } from "moment";
import { userInfo } from "os";
import { createLogic } from "redux-logic";
import { LIST_DELIMITER_SPLIT } from "../../constants";

import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { pivotAnnotations, splitTrimAndFilter } from "../../util";
import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { addPendingJob, removePendingJobs, retrieveJobs } from "../job/actions";
import { getAnnotationTypes, getBooleanAnnotationTypeId } from "../metadata/selectors";
import { Channel } from "../metadata/types";
import { deselectFiles, goForward } from "../selection/actions";
import { getSelectedBarcode } from "../selection/selectors";
import { addTemplateIdToSettings } from "../setting/actions";
import { getTemplate } from "../template/actions";
import { getAppliedTemplate } from "../template/selectors";
import { ColumnType } from "../template/types";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";

import { removeUploads, updateUploads } from "./actions";
import {
    APPLY_TEMPLATE,
    ASSOCIATE_FILES_AND_WELLS,
    CANCEL_UPLOAD,
    getUploadRowKey,
    INITIATE_UPLOAD,
    RETRY_UPLOAD,
    UPDATE_SCENES,
    UPDATE_UPLOAD,
} from "./constants";
import { getUpload, getUploadJobName, getUploadPayload } from "./selectors";
import { UploadMetadata, UploadStateBranch } from "./types";

const associateFileAndWellLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const state = getState();
        action.payload = {
            ...action.payload,
            barcode: getSelectedBarcode(state),
        };
        next(batchActions([
            action,
            deselectFiles(),
        ]));
    },
    type: ASSOCIATE_FILES_AND_WELLS,
});

// This logic will request the template from MMS and remove any old columns from existing uploads
// The template applied does not contain annotation information yet
const applyTemplateLogic = createLogic({
    process: ({ctx, getState, labkeyClient, mmsClient}: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        if (ctx.templateId) {
            // these need to be dispatched separately to go through logics
            dispatch(getTemplate(ctx.templateId, true));
            dispatch(addTemplateIdToSettings(ctx.templateId));
        }

        done();
    },
    transform: ({action, ctx, getState, labkeyClient}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb) => {
        const {template} = action.payload;
        if (template) {
            ctx.templateId = template.TemplateId;
        }
        const state = getState();
        const uploads: UploadStateBranch = getUpload(state);

        map(uploads,  (upload: UploadMetadata, filepath: string) => {
            // By only grabbing the initial fields of the upload we can remove old schema columns
            // We're also apply the new templateId now
            const { barcode, notes, wellIds, wellLabels, workflows } = upload;
            action.payload.uploads[getUploadRowKey(filepath)] = {
                barcode,
                file: upload.file,
                notes,
                templateId: template ? template.TemplateId : undefined,
                wellIds,
                wellLabels,
                workflows,
            };
        });
        next(action);
    },
    type: APPLY_TEMPLATE,
});

const initiateUploadLogic = createLogic({
    process: async ({ctx, fms, getState, ipcRenderer}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const now = new Date();
        try {
            // this selector throws errors if the payload cannot be constructed so don't move back to the UploadSummary
            // page until we call it successfully.
            const payload = getUploadPayload(getState());

            // Go forward needs to be handled by redux-logic so we're dispatching separately
            dispatch(goForward());

            dispatch(addPendingJob({
                created: now,
                currentStage: "Pending",
                jobId: (now).toLocaleString(),
                jobName: ctx.name,
                modified: now,
                status: "WAITING",
                uploads: ctx.uploads,
                user: userInfo().username,
            }));
            await fms.uploadFiles(payload, ctx.name);
        } catch (e) {
            Logger.error(`UPLOAD_FAILED for jobName=${ctx.name}`, e.message);
            dispatch(setAlert({
                message: `Upload Failed: ${e.message}`,
                type: AlertType.ERROR,
            }));
        }

        dispatch(removePendingJobs(ctx.name));
        done();
    },
    transform: async ({action, ctx, fms, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            await fms.validateMetadata(getUploadPayload(getState()));
            ctx.name = getUploadJobName(getState());
            ctx.uploads = getUploadPayload(getState());
            next(batchActions([
                setAlert({
                    message: "Starting upload",
                    type: AlertType.INFO,
                }),
                action,
            ]));
        } catch (e) {
            next(setAlert({
                message: e.message || "Validation error",
                type: AlertType.ERROR,
            }));
        }
    },
    type: INITIATE_UPLOAD,
});

const cancelUploadLogic = createLogic({
    process: async ({action, ctx, jssClient, getState}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const uploadJob: UploadSummaryTableRow = action.payload;

        dispatch(setAlert({
            message: `Cancel upload ${uploadJob.jobName}`,
            type: AlertType.INFO,
        }));
        dispatch(addRequestToInProgress(AsyncRequest.CANCEL_UPLOAD));

        try {
            await jssClient.updateJob(uploadJob.jobId, {
                serviceFields: {
                    error: "Cancelled by user",
                },
                status: "UNRECOVERABLE",
            });
            dispatch(setAlert({
                message: `Cancel upload ${uploadJob.jobName} succeeded!`,
                type: AlertType.SUCCESS,
            }));
            dispatch(retrieveJobs());
        } catch (e) {
            Logger.error(`Cancel for jobId=${uploadJob.jobId} failed`, e);
            dispatch(setAlert({
                message: `Cancel upload ${uploadJob.jobName} failed: ${e.message}`,
                type: AlertType.ERROR,
            }));
        }

        dispatch(removeRequestFromInProgress(AsyncRequest.CANCEL_UPLOAD));
        done();
    },
    transform: ({ action, ctx, fms, getState, remote }: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb, reject: () => void) => {
        const uploadJob: UploadSummaryTableRow = action.payload;
        if (!uploadJob) {
            next(setAlert({
                message: "Cannot cancel undefined upload job",
                type: AlertType.ERROR,
            }));
        } else {
            remote.dialog.showMessageBox({
                buttons: ["No", "Yes"],
                cancelId: 0,
                defaultId: 1,
                message: "An upload cannot be restarted once cancelled. Continue?",
                title: "Warning",
                type: "warning",
            }, (response: number) => {
                if (response === 1) {
                    next(action);
                } else {
                    reject();
                }
            });
        }
    },
    type: CANCEL_UPLOAD,
});

const retryUploadLogic = createLogic({
    process: async ({action, ctx, fms, getState}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const uploadJob: UploadSummaryTableRow = action.payload;

        dispatch(setAlert({
            message: `Retry upload ${uploadJob.jobName}`,
            type: AlertType.INFO,
        }));
        dispatch(addRequestToInProgress(AsyncRequest.RETRY_UPLOAD));

        try {
            await fms.retryUpload(action.payload);
            dispatch(setAlert({
                message: `Retry upload ${uploadJob.jobName} succeeded!`,
                type: AlertType.SUCCESS,
            }));
            dispatch(retrieveJobs());
        } catch (e) {
            Logger.error(`Retry for jobId=${uploadJob.jobId} failed`, e);
            dispatch(setAlert({
                message: `Retry upload ${uploadJob.jobName} failed: ${e.message}`,
                type: AlertType.ERROR,
            }));
        }

        dispatch(removeRequestFromInProgress(AsyncRequest.RETRY_UPLOAD));
        done();
    },
    transform: ({action, ctx, fms, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const uploadJob: UploadSummaryTableRow = action.payload;
        if (!uploadJob) {
            next(setAlert({
                message: "Cannot retry undefined upload job",
                type: AlertType.ERROR,
            }));
        } else {
            next(action);
        }
    },
    type: RETRY_UPLOAD,
});

const updateScenesLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const uploads = getUpload(getState());
        const {channels, positionIndexes, row} = action.payload;
        const update: Partial<UploadStateBranch> = {};
        const workflows = splitTrimAndFilter(row.workflows);

        const existingUploadsForFile = values(uploads).filter((u) => u.file === row.file);
        const fileUpload: UploadMetadata | undefined = existingUploadsForFile
            .find((u) => isNil(u.channelId) && isNil(u.positionIndex));

        if (!fileUpload) {
            throw new Error("Could not find the main upload for the file. Contact Software.");
        }

        const template = getAppliedTemplate(getState());
        const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());

        if (!template) {
            throw new Error("Could not get applied template while attempting to update scenes. Contact Software.");
        }

        if (!booleanAnnotationTypeId) {
            throw new Error(
                "Could not get boolean annotation type id while attempting to update scenes. Contact Software."
            );
        }

        const additionalAnnotations = pivotAnnotations(template.annotations, booleanAnnotationTypeId);

        // if there are positions for a file, remove the well association from the file row
        const fileRowKey = getUploadRowKey(row.file);
        if (!isEmpty(positionIndexes)) {
            update[fileRowKey] = {
                ...uploads[fileRowKey],
                wellIds: [],
                wellLabels: [],
            };
        }

        // add channel rows that are new
        const oldChannelIds = row.channelIds || [];
        channels.filter((c: Channel) => !includes(oldChannelIds, c.channelId))
            .forEach((channel: Channel) => {
                const key = getUploadRowKey(row.file, undefined, channel.channelId);
                update[key] = {
                    barcode: row.barcode,
                    channel,
                    file: row.file,
                    key,
                    notes: undefined,
                    positionIndex: undefined,
                    wellIds: [],
                    wellLabels: [],
                    workflows,
                    ...additionalAnnotations,
                };
            });

        // add uploads that are new
        positionIndexes.forEach((positionIndex: number) => {
            const matchingSceneRow = existingUploadsForFile
                .find((u: UploadMetadata) => u.positionIndex === positionIndex && isNil(u.channelId));

            if (!matchingSceneRow) {
                const sceneOnlyRowKey = getUploadRowKey(row.file, positionIndex);
                update[sceneOnlyRowKey] = {
                    barcode: row.barcode,
                    channel: undefined,
                    file: row.file,
                    key: sceneOnlyRowKey,
                    notes: undefined,
                    positionIndex,
                    wellIds: [],
                    wellLabels: [],
                    workflows,
                    ...additionalAnnotations,
                };
            }

            channels.forEach((channel: Channel) => {
                const matchingChannelRow = existingUploadsForFile
                    .find((u: UploadMetadata) => !isNil(u.positionIndex) && !isNil(u.channelId));

                if (!matchingChannelRow) {
                    const key = getUploadRowKey(row.file, positionIndex, channel.channelId);
                    update[key] = {
                        barcode: row.barcode,
                        channel,
                        file: row.file,
                        key,
                        notes: undefined,
                        positionIndex,
                        wellIds: [],
                        wellLabels: [],
                        workflows,
                        ...additionalAnnotations,
                    };
                }
            });
        });

        // delete the uploads that don't exist anymore
        const channelIds = channels.map((c: Channel) => c.channelId);
        const rowsToDelete = existingUploadsForFile
            .filter((u) => (!isNil(u.positionIndex) && !includes(positionIndexes, u.positionIndex)) ||
                (!isNil(u.channel) && !includes(channelIds, u.channel.channelId)));
        const rowKeysToDelete = rowsToDelete.map(({file, positionIndex, channel}: UploadMetadata) =>
            getUploadRowKey(file, positionIndex, channel ? channel.channelId : undefined));

        next(batchActions([
            updateUploads(update),
            removeUploads(rowKeysToDelete),
        ]));
    },
    type: UPDATE_SCENES,
});

const parseStringArray = (rawValue?: string) => rawValue ? splitTrimAndFilter(rawValue) : undefined;

const parseNumberArray = (rawValue?: string) => {
    if (!rawValue) {
        return undefined;
    }

    // Remove anything that isn't a number, comma, or whitespace
    rawValue = rawValue.replace(/[^0-9,\s]/g, "");
    return rawValue.split(LIST_DELIMITER_SPLIT)
        .map(parseNumber)
        .filter((v: number) => !Number.isNaN(v));
};

// returns int if no decimals and float if not
const parseNumber = (n: string) => {
    const trimmed = trim(n);
    let parsed = parseFloat(trimmed);

    // convert to int if no decimals
    if (parsed % 1 !== 0) {
        parsed = parseInt(trimmed, 10);
    }

    return parsed;
};

// Here we take care of custom inputs that handle arrays for strings and numbers.
// If we can create a valid array from the text of the input, we'll transform it into an array
// if not, we pass the value untouched to the reducer.
// Additionally we take care of converting moment dates back to dates.
const INVALID_NUMBER_INPUT_REGEX = /[^0-9,\s]/g;
const updateUploadLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const {upload} = action.payload;
        const state = getState();
        const template = getAppliedTemplate(state);
        const annotationTypes = getAnnotationTypes(state);

        if (!template || !annotationTypes) {
            next(action);
        } else {
            const formattedUpload: Partial<UploadMetadata> = {};
            forEach(upload, (value: any, key: string) => {
                const annotation = template.annotations.find((a) => a.name === key);

                if (annotation) {
                    const annotationType = annotationTypes
                        .find((at) => at.annotationTypeId === annotation.annotationTypeId);

                    if (annotationType) {
                        const { canHaveManyValues } = annotation;
                        const type = annotationType.name;
                        const endsWithComma = trim(value).endsWith(",");

                        // numbers are formatted in text Inputs so they'll be strings at this point
                        if (type === ColumnType.NUMBER && value && canHaveManyValues) {
                            // Remove anything that isn't a number, comma, or whitespace
                            value = value.replace(INVALID_NUMBER_INPUT_REGEX, "");
                        }

                        // antd's DatePicker passes a moment object rather than Date so we convert back here
                        if (type === ColumnType.DATETIME || type === ColumnType.DATE) {
                            if (canHaveManyValues) {
                                value = (value || [])
                                    .filter((d: Moment) => !!d)
                                    .map((d: Moment) => d instanceof Date ? d : d.toDate());
                            } else {
                                value = value instanceof Date || !value ? value : value.toDate();
                            }
                        } else if (type === ColumnType.NUMBER && canHaveManyValues && !endsWithComma) {
                            value = parseNumberArray(value);
                        } else if (type === ColumnType.TEXT && canHaveManyValues && !endsWithComma) {
                            value = parseStringArray(value);
                        }
                    }
                }

                formattedUpload[key] = value;
            });

            next({
                ...action,
                payload: {
                    ...action.payload,
                    upload: formattedUpload,
                },
            });
        }
    },
    type: UPDATE_UPLOAD,
});

export default [
    applyTemplateLogic,
    associateFileAndWellLogic,
    cancelUploadLogic,
    initiateUploadLogic,
    retryUploadLogic,
    updateScenesLogic,
    updateUploadLogic,
];
