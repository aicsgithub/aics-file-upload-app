import { forEach, includes, isEmpty, isNil, map, trim, values, without } from "lodash";
import { isDate, isMoment } from "moment";
import { userInfo } from "os";
import { basename, dirname, resolve as resolvePath } from "path";
import { createLogic } from "redux-logic";

import { INCOMPLETE_JOB_NAMES_KEY } from "../../../shared/constants";

import { LIST_DELIMITER_SPLIT } from "../../constants";
import { getCurrentUploadName } from "../../containers/App/selectors";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { getUploadFilePromise, mergeChildPaths, pivotAnnotations, splitTrimAndFilter } from "../../util";
import {
    addRequestToInProgress,
    clearUploadError,
    closeModal,
    openModal,
    removeRequestFromInProgress,
    setAlert,
    setDeferredAction,
    setErrorAlert,
    setUploadError,
} from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { addPendingJob, removePendingJobs, updateIncompleteJobNames } from "../job/actions";
import { getCurrentJobName, getIncompleteJobNames } from "../job/selectors";
import { setCurrentUpload } from "../metadata/actions";
import { getAnnotationTypes, getBooleanAnnotationTypeId, getCurrentUpload } from "../metadata/selectors";
import { Channel, CurrentUpload } from "../metadata/types";
import {
    deselectFiles,
    stageFiles,
} from "../selection/actions";
import { getSelectedBarcode, getSelectedWellIds, getStagedFiles } from "../selection/selectors";
import { UploadFile } from "../selection/types";
import { updateSettings } from "../setting/actions";
import { getTemplate } from "../template/actions";
import { getAppliedTemplate } from "../template/selectors";
import { ColumnType } from "../template/types";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicRejectCb,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";

import { clearUploadDraft, removeUploads, replaceUpload, updateUpload, updateUploads } from "./actions";
import {
    APPLY_TEMPLATE,
    ASSOCIATE_FILES_AND_WELLS,
    CANCEL_UPLOAD,
    EDIT_FILE_METADATA_FOR_JOB,
    getUploadDraftKey,
    getUploadRowKey,
    INITIATE_UPLOAD,
    isSubImageOnlyRow,
    OPEN_UPLOAD_DRAFT,
    RETRY_UPLOAD,
    SAVE_UPLOAD_DRAFT,
    UNDO_FILE_WELL_ASSOCIATION,
    UPDATE_FILES_TO_ARCHIVE,
    UPDATE_FILES_TO_STORE_ON_ISILON,
    UPDATE_SUB_IMAGES,
    UPDATE_UPLOAD,
} from "./constants";
import { getCanSaveUploadDraft, getUpload, getUploadPayload } from "./selectors";
import { UploadMetadata, UploadRowId, UploadStateBranch } from "./types";

const associateFilesAndWellsLogic = createLogic({
    type: ASSOCIATE_FILES_AND_WELLS,
    validate: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        const { rowIds } = action.payload;
        if (isEmpty(action.payload.rowIds)) {
            reject(setErrorAlert("Cannot associate files and wells: No files selected"));
            return;
        }

        const rowWithChannel = rowIds.find((id: UploadRowId) => id.channelId);
        if (rowWithChannel) {
            reject(setErrorAlert("Cannot associate wells with a channel row"));
        }

        const state = getState();
        const barcode = getSelectedBarcode(state);
        const wellIds = getSelectedWellIds(state);

        if (!barcode) {
            reject(setErrorAlert("Cannot associate files and wells: No plate selected"));
            return;
        }

        if (isEmpty(wellIds)) {
            reject(setErrorAlert("Cannot associate files and wells: No wells selected"));
            return;
        }

        action.payload = {
            ...action.payload,
            barcode: getSelectedBarcode(state),
            wellIds: getSelectedWellIds(state),
        };
        next(batchActions([
            action,
            deselectFiles(),
        ]));
    },
});

const undoFileWellAssociationLogic = createLogic({
    type: UNDO_FILE_WELL_ASSOCIATION,
    validate: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        const state = getState();
        const wellIds = isEmpty(action.payload.wellIds) ? getSelectedWellIds(state) : action.payload.wellIds;
        if (isEmpty(wellIds)) {
            reject(setErrorAlert("Cannot undo file and well associations: No wells selected"));
            return;
        }

        action.payload = {
            ...action.payload,
            wellIds,
        };
        next(action);
    },

});

// This logic will request the template from MMS and remove any old columns from existing uploads
// The template applied does not contain annotation information yet
const applyTemplateLogic = createLogic({
    process: ({ctx, getState, labkeyClient, mmsClient}: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const { templateId } = ctx;
        if (templateId) {
            // these need to be dispatched separately to go through logics
            dispatch(getTemplate(templateId, true));
            dispatch(updateSettings({ templateId }));
        }

        done();
    },
    transform: ({action, ctx, getState, labkeyClient}: ReduxLogicTransformDependencies,
                next: ReduxLogicNextCb) => {
        const { clearAnnotations, templateId } = action.payload;
        ctx.templateId = templateId;

        const uploads = getUpload(getState());
        forEach(uploads,  (upload: UploadMetadata) => {
            // By only grabbing the initial fields of the upload we can remove old schema columns
            // We're also apply the new templateId now
            const {
                barcode,
                channelId,
                file,
                notes,
                positionIndex,
                scene,
                shouldBeInArchive,
                shouldBeInLocal,
                subImageName,
                wellIds,
                workflows,
            } = upload;
            const key = getUploadRowKey({
                channelId,
                file,
                positionIndex,
                scene,
                subImageName,
            });
            if (clearAnnotations) {
                action.payload.uploads[key] = {
                    barcode,
                    file: upload.file,
                    notes,
                    shouldBeInArchive,
                    shouldBeInLocal,
                    templateId,
                    wellIds,
                    workflows,
                };
            } else {
                action.payload.uploads[key] = {
                    ...upload,
                    templateId,
                };
            }

        });

        next(action);
    },
    type: APPLY_TEMPLATE,
});

const initiateUploadLogic = createLogic({
    process: async ({ctx, fms, getState, ipcRenderer, logger}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const now = new Date();
        const uploads = getUploadPayload(getState());
        const { jobName } = ctx;

        try {
            const payload = getUploadPayload(getState());
            const { job: { incompleteJobNames } } = getState();
            const updatedIncompleteJobNames = [...incompleteJobNames, jobName];

            dispatch(
                {
                    ...batchActions([
                        addPendingJob({
                            created: now,
                            currentStage: "Pending",
                            jobId: (now).toLocaleString(),
                            jobName,
                            modified: now,
                            status: "WAITING",
                            uploads,
                            user: userInfo().username,
                        }),
                        updateIncompleteJobNames(updatedIncompleteJobNames),
                        clearUploadError(),
                    ]),
                    updates: {
                        [INCOMPLETE_JOB_NAMES_KEY]: updatedIncompleteJobNames,
                    },
                    writeToStore: true,
                }
            );
            await fms.uploadFiles(payload, jobName);
        } catch (e) {
            const error = `Upload Failed: ${e.message}`;
            logger.error(error);
            dispatch(batchActions([
                setErrorAlert(error),
                removePendingJobs([jobName]),
                updateIncompleteJobNames(without(getIncompleteJobNames(getState()), jobName)),
                setUploadError(error),
            ]));
        }

        done();
    },
    type: INITIATE_UPLOAD,
    validate: async ({action, ctx, fms, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
                     rejectCb: ReduxLogicRejectCb) => {
        ctx.jobName = getCurrentJobName(getState());
        if (!ctx.jobName) {
            rejectCb({ type: "ignore" });
            return;
        }

        try {
            await fms.validateMetadata(getUploadPayload(getState()));
            next(batchActions([
                setAlert({
                    message: "Starting upload",
                    type: AlertType.INFO,
                }),
                action,
            ]));
        } catch (e) {
            rejectCb(setAlert({
                message: e.message || "Validation error",
                type: AlertType.ERROR,
            }));
        }
    },
});

const cancelUploadLogic = createLogic({
    process: async ({action, ctx, jssClient, getState, logger}: ReduxLogicProcessDependencies,
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
        } catch (e) {
            logger.error(`Cancel for jobId=${uploadJob.jobId} failed`, e);
            dispatch(setAlert({
                message: `Cancel upload ${uploadJob.jobName} failed: ${e.message}`,
                type: AlertType.ERROR,
            }));
        }

        dispatch(removeRequestFromInProgress(AsyncRequest.CANCEL_UPLOAD));
        done();
    },
    type: CANCEL_UPLOAD,
    validate: ({ action, ctx, dialog, fms, getState }: ReduxLogicTransformDependencies,
               next: ReduxLogicNextCb, reject: ReduxLogicRejectCb) => {
        const uploadJob: UploadSummaryTableRow = action.payload;
        if (!uploadJob) {
            next(setAlert({
                message: "Cannot cancel undefined upload job",
                type: AlertType.ERROR,
            }));
        } else {
            dialog.showMessageBox({
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
                    reject({type: "ignore"});
                }
            });
        }
    },
});

const retryUploadLogic = createLogic({
    process: async ({action, ctx, fms, getState, logger}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const uploadJob: UploadSummaryTableRow = action.payload;

        dispatch(setAlert({
            message: `Retry upload ${uploadJob.jobName}`,
            type: AlertType.INFO,
        }));
        dispatch(addRequestToInProgress(AsyncRequest.RETRY_UPLOAD));

        try {
            await fms.retryUpload(uploadJob);
            dispatch(setAlert({
                message: `Retry upload ${uploadJob.jobName} succeeded!`,
                type: AlertType.SUCCESS,
            }));
        } catch (e) {
            logger.error(`Retry for jobId=${uploadJob.jobId} failed`, e);
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

const getSubImagesAndKey = (positionIndexes: number[], scenes: number[], subImageNames: string[]) => {
    let subImages: Array<string | number> = positionIndexes;
    let subImageKey: keyof UploadMetadata = "positionIndex";
    if (isEmpty(subImages)) {
        subImages = scenes;
        subImageKey = "scene";
    }
    if (isEmpty(subImages)) {
        subImages = subImageNames;
        subImageKey = "subImageName";
    }
    subImages = subImages || [];
    return {
        subImageKey,
        subImages,
    };
};

// This handles the event where a user adds subimages in the form of positions/scenes/names (only one type allowed)
// and/or channels.
// When this happens we want to:
// (1) delete rows representing subimages and channels that we no longer care about
// (2) create new rows for subimages and channels that are new
// (3) remove wells from file row if a sub image was added.
// For rows containing subimage or channel information that was previously there, we do nothing, as to save
// anything that user has entered for that row.
const updateSubImagesLogic = createLogic({
    type: UPDATE_SUB_IMAGES,
    validate: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        const {channels, positionIndexes, row: fileRow, scenes, subImageNames} = action.payload;
        let notEmptySubImageParams = 0;
        if (!isEmpty(positionIndexes)) {
            notEmptySubImageParams++;
        }

        if (!isEmpty(scenes)) {
            notEmptySubImageParams++;
        }

        if (!isEmpty(subImageNames)) {
            notEmptySubImageParams++;
        }

        if (notEmptySubImageParams > 1) {
            reject(setErrorAlert("Could not update sub images. Found more than one type of subImage in request"));
            return;
        }

        const channelIds = channels.map((c: Channel) => c.channelId);
        const {subImageKey, subImages} = getSubImagesAndKey(positionIndexes, scenes, subImageNames);
        const update: Partial<UploadStateBranch> = {};
        const workflows = splitTrimAndFilter(fileRow.workflows);

        const uploads = getUpload(getState());
        const existingUploadsForFile: UploadMetadata[] = values(uploads).filter((u) => u.file === fileRow.file);

        const template = getAppliedTemplate(getState());
        const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());

        if (!template) {
            next(setErrorAlert("Could not get applied template while attempting to update file sub images. Contact Software."));
            return;
        }

        if (!booleanAnnotationTypeId) {
            next(setErrorAlert(
                "Could not get boolean annotation type id while attempting to update file sub images. Contact Software."
            ));
            return;
        }

        const additionalAnnotations = pivotAnnotations(template.annotations, booleanAnnotationTypeId);

        // If there are subimages for a file, remove the well associations from the file row
        if (!isEmpty(subImages)) {
            update[fileRow.key] = {
                ...uploads[fileRow.key],
                wellIds: [],
            };
        }

        // add channel rows that are new
        const oldChannelIds = fileRow.channelIds || [];
        channels.filter((c: Channel) => !includes(oldChannelIds, c.channelId))
            .forEach((channel: Channel) => {
                const key = getUploadRowKey({file: fileRow.file, channelId: channel.channelId});
                update[key] = {
                    barcode: fileRow.barcode,
                    channel,
                    file: fileRow.file,
                    key,
                    notes: undefined,
                    positionIndex: undefined,
                    scene: undefined,
                    subImageName: undefined,
                    wellIds: [],
                    workflows,
                    ...additionalAnnotations,
                };
            });

        // add uploads that are new
        subImages.forEach((subImageValue: string | number) => {
            const matchingSubImageRow = existingUploadsForFile
                .filter(isSubImageOnlyRow)
                .find((u: UploadMetadata) => u[subImageKey] === subImageValue);

            if (!matchingSubImageRow) {
                const subImageOnlyRowKey = getUploadRowKey({file: fileRow.file, [subImageKey]: subImageValue});
                update[subImageOnlyRowKey] = {
                    barcode: fileRow.barcode,
                    channel: undefined,
                    file: fileRow.file,
                    key: subImageOnlyRowKey,
                    notes: undefined,
                    wellIds: [],
                    workflows,
                    [subImageKey]: subImageValue,
                    ...additionalAnnotations,
                };
            }

            channels.forEach((channel: Channel) => {
                const matchingChannelRow = existingUploadsForFile
                    .find((u) => (u.channel && u.channel.channelId === channel.channelId) &&
                        u[subImageKey] === subImageValue
                    );

                if (!matchingChannelRow) {
                    const key = getUploadRowKey({
                        channelId: channel.channelId,
                        file: fileRow.file,
                        [subImageKey]: subImageValue,
                    });
                    update[key] = {
                        barcode: fileRow.barcode,
                        channel,
                        file: fileRow.file,
                        key,
                        notes: undefined,
                        wellIds: [],
                        workflows,
                        [subImageKey]: subImageValue,
                        ...additionalAnnotations,
                    };
                }
            });
        });

        // delete the uploads that don't exist anymore
        const rowKeysToDelete = existingUploadsForFile
            .filter((u) => (!isNil(u.positionIndex) && !includes(positionIndexes, u.positionIndex)) ||
                (!isNil(u.scene) && !includes(scenes, u.scene)) ||
                (!isNil(u.subImageName) && !includes(subImageNames, u.subImageName)) ||
                (!isNil(u.channel) && !includes(channelIds, u.channel.channelId)))
            .map(({file, positionIndex, channel, scene, subImageName}: UploadMetadata) =>
                getUploadRowKey({
                    channelId: channel ? channel.channelId : undefined,
                    file,
                    positionIndex,
                    scene,
                    subImageName,
                })
            );

        next(batchActions([
            updateUploads(update),
            removeUploads(rowKeysToDelete),
        ]));
    },
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

// antd's DatePicker passes a moment object rather than Date so we convert back here
// sometimes the input is invalid and does not get converted to a moment object so
// we're typing it as any
const convertDatePickerValueToDate = (d: any) => {
    if (isDate(d)) {
        return d;
    } else if (isMoment(d)) {
        return d.toDate();
    } else {
        return undefined;
    }
};

// Here we take care of custom inputs that handle arrays for strings and numbers.
// If we can create a valid array from the text of the input, we'll transform it into an array
// if not, we pass the value untouched to the reducer.
// Additionally we take care of converting moment dates back to dates.
const INVALID_NUMBER_INPUT_REGEX = /[^0-9,\s]/g;
const updateUploadLogic = createLogic({
    transform: ({action, getState, logger}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
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
                        try {
                            const { canHaveManyValues } = annotation;
                            const type = annotationType.name;
                            const endsWithComma = trim(value).endsWith(",");

                            // numbers are formatted in text Inputs so they'll be strings at this point
                            if (type === ColumnType.NUMBER && value && canHaveManyValues) {
                                // Remove anything that isn't a number, comma, or whitespace
                                value = value.replace(INVALID_NUMBER_INPUT_REGEX, "");
                            }

                            if (type === ColumnType.DATETIME || type === ColumnType.DATE) {
                                if (canHaveManyValues) {
                                    value = (value || [])
                                        .map(convertDatePickerValueToDate)
                                        .filter((d: any) => !isNil(d));
                                } else {
                                    value = convertDatePickerValueToDate(value);
                                }
                            } else if (type === ColumnType.NUMBER && canHaveManyValues && !endsWithComma) {
                                value = parseNumberArray(value);
                            } else if (type === ColumnType.TEXT && canHaveManyValues && !endsWithComma) {
                                value = parseStringArray(value);
                            }
                        } catch (e) {
                            logger.error("Something went wrong while updating metadata: ", e.message);
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

const updateFilesToStoreOnIsilonLogic = createLogic({
    transform: ({action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const updates = map(
            action.payload,
            (shouldBeInLocal: boolean, file: string) =>
                updateUpload(getUploadRowKey({file}), {shouldBeInLocal})
        );
        next(batchActions(updates));
    },
    type: UPDATE_FILES_TO_STORE_ON_ISILON,
});

const updateFilesToStoreInArchiveLogic = createLogic({
    transform: ({action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const updates = map(
            action.payload,
            (shouldBeInArchive: boolean, file: string) =>
                updateUpload(getUploadRowKey({file}), {shouldBeInArchive})
        );
        next(batchActions(updates));
    },
    type: UPDATE_FILES_TO_ARCHIVE,
});

// Saves what is currently in the upload wizard tab whether a new upload in progress or
// a draft that was saved previously
const saveUploadDraftLogic = createLogic({
    type: SAVE_UPLOAD_DRAFT,
    validate: ({ action, getState, storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        const upload = getUpload(getState());
        if (isEmpty(upload)) {
            reject(setErrorAlert("Nothing to save"));
            return;
        }

        const draftName = trim(action.payload) || getCurrentUploadName(getState());
        if (!draftName) {
            reject(setErrorAlert("Draft name cannot be empty"));
            return;
        }

        const currentUpload = getCurrentUpload(getState()); // this is populated if the draft was saved previously
        const created = currentUpload ? currentUpload.created : new Date();
        const draftKey: string | undefined = getUploadDraftKey(draftName, created);

        const metadata: CurrentUpload = {
            created,
            modified: currentUpload ? currentUpload.modified : created,
            name: draftName,
        };

        next({
            updates: {
                [draftKey]: { metadata, state: getState() },
                ...clearUploadDraft().updates,
            },
            writeToStore: true,
            ...setCurrentUpload(metadata),
        });
    },
});

const openUploadLogic = createLogic({
    process: async ({ ctx, getState }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const { draft } = ctx;
        const topLevelFilesToLoadAgain = getStagedFiles(draft.state).map((f) => resolvePath(f.path, f.name));
        const filesToLoad: string[] = mergeChildPaths(topLevelFilesToLoadAgain);
        try {
            const uploadFilePromises: Array<Promise<UploadFile>> = filesToLoad.map((filePath: string) => (
                getUploadFilePromise(basename(filePath), dirname(filePath))
            ));
            const uploadFiles = await Promise.all(uploadFilePromises);
            dispatch(stageFiles(uploadFiles));
        } catch (e) {
            dispatch(setErrorAlert(`Encountered error while resolving files: ${e}`));
        }

        done();
    },
    type: OPEN_UPLOAD_DRAFT,
    validate: ({ action, ctx, getState, storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        const draft = storage.get(action.payload);
        ctx.draft = draft;
        if (!draft) {
            reject(setErrorAlert(`Could not find draft named ${action.payload}`));
            return;
        }

        const nextAction = replaceUpload(draft); // also close modal
        if (getCanSaveUploadDraft(getState())) {
            next(batchActions([
                openModal("saveUploadDraft"),
                closeModal("openUpload"),
                setDeferredAction(nextAction),
            ]));
        } else {
            next(batchActions([
                nextAction,
                closeModal("openUpload"),
            ]));
        }
    },
});

const editFileMetadataForJob = createLogic({
    transform: ({ action, getState }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        // const { payload: job } = action;
        // save current upload if there
        const state = getState();
        const currentUploadName = getCurrentUploadName(state);
        if (currentUploadName) {

        } else if (getCanSaveUploadDraft(state)) {
            // Case 2: upload tab is open but draft has not been saved. Since we cannot handle more
            // than one upload at a time (lame, I know but this is temporary)
            // ask user if they want to save current upload first
            // set some actions to be dispatched later after this modal is closed
            next(batchActions([
                openModal("saveUploadDraft"),
                // setDeferredAction(batchActions()),
            ]));
        }
        // request file metadata
    },
    type: EDIT_FILE_METADATA_FOR_JOB,
});

export default [
    applyTemplateLogic,
    associateFilesAndWellsLogic,
    cancelUploadLogic,
    editFileMetadataForJob,
    initiateUploadLogic,
    openUploadLogic,
    retryUploadLogic,
    saveUploadDraftLogic,
    undoFileWellAssociationLogic,
    updateSubImagesLogic,
    updateUploadLogic,
    updateFilesToStoreOnIsilonLogic,
    updateFilesToStoreInArchiveLogic,
];
