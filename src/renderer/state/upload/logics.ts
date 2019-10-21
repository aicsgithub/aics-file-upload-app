import Logger from "js-logger";
import { includes, isNil, map, values } from "lodash";
import { userInfo } from "os";
import { createLogic } from "redux-logic";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

import { addEvent, addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { addPendingJob, removePendingJobs, retrieveJobs } from "../job/actions";
import { getDatabaseMetadata } from "../metadata/selectors";
import { Channel, DatabaseMetadata, Table } from "../metadata/types";
import { deselectFiles } from "../selection/actions";
import { getSelectedBarcode } from "../selection/selectors";
import { ColumnDefinition, ColumnType } from "../setting/types";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { removeUploads, updateUploads } from "./actions";
import {
    ASSOCIATE_FILES_AND_WELLS,
    getUploadRowKey,
    INITIATE_UPLOAD,
    RETRY_UPLOAD,
    UPDATE_SCENES,
    UPDATE_SCHEMA,
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

// This logic is to add new user-defined columns to each upload row, and remove any old columns
const updateSchemaLogic = createLogic({
    transform: async ({action, getState, labkeyClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const { schema, schemaFile } = action.payload;
        const state = getState();
        const uploads: UploadStateBranch = getUpload(state);
        const tables: DatabaseMetadata | undefined = getDatabaseMetadata(state);

        await Promise.all(map(uploads, (async (upload: UploadMetadata, filepath: string): Promise<void> => {
            // By only grabbing the initial fields of the upload we can remove old schema columns
            const uploadData: UploadMetadata = {
                barcode: upload.barcode,
                file: upload.file,
                notes: upload.notes,
                schemaFile,
                wellIds: upload.wellIds,
                wellLabels: upload.wellLabels,
                workflows: upload.workflows,
            };
            if (schema) {
                // We want to have all values consistently be either null or false so we can detect them in the upload
                // especially for cases where null is a distinct value that we would have otherwise ignored
                // However, boolean fields need to be false by default because otherwise we would have null === false
                // which isn't necessarily true (except to javascript)
                await Promise.all(schema.columns.map(async (column: ColumnDefinition): Promise<void> => {
                    if (!isNil(upload[column.label])) {
                        uploadData[column.label] = upload[column.label];
                    } else {
                        uploadData[column.label] = column.type.type === ColumnType.BOOLEAN ? false : null;
                        if (column.type.type === ColumnType.LOOKUP && tables) {
                            const { name, schemaName }: Table = tables[column.type.table];
                            column.type.dropdownValues = await labkeyClient.getColumnValues(schemaName,
                                name,
                                column.type.column);
                        }
                    }
                }));
            }
            action.payload.uploads[filepath] = uploadData;
        })));
        next(action);
    },
    type: UPDATE_SCHEMA,
});

const initiateUploadLogic = createLogic({
    process: async ({ctx, fms, getState, ipcRenderer}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const now = new Date();
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

        try {
            const result = await fms.uploadFiles(getUploadPayload(getState()), ctx.name);
            Logger.debug(`UPLOAD_FINISHED for jobName=${ctx.name} with result:`, result);
            dispatch(addEvent("Upload Finished", AlertType.SUCCESS, new Date()));

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

        const existingUploadsForFile = values(uploads).filter((u) => u.file === row.file);
        const fileUpload: UploadMetadata | undefined = existingUploadsForFile
            .find((u) => isNil(u.channelId) && isNil(u.positionIndex));

        if (!fileUpload) {
            throw new Error(""); // todo
        }

        // if there are positions for a file, remove the well association from the file row
        const fileRowKey = getUploadRowKey(row.file);
        update[fileRowKey] = {
            ...uploads[fileRowKey],
            wellIds: [],
            wellLabels: [],
        };

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
                    workflows: row.workflows.split(", "),
                }; // todo additional custom fields?
            });

        // add uploads that are new
        positionIndexes.forEach((positionIndex: number) => {
            const matchingSceneRow = existingUploadsForFile
                .find((u: UploadMetadata) => !isNil(u.positionIndex) && isNil(u.channelId));

            if (!matchingSceneRow) {
                update[getUploadRowKey(row.file, positionIndex)] = {
                    barcode: row.barcode,
                    channel: undefined,
                    file: row.file,
                    key: getUploadRowKey(row.file, positionIndex),
                    notes: undefined,
                    positionIndex,
                    wellIds: [],
                    wellLabels: [],
                    workflows: row.workflows.split(", "),
                }; // todo additional custom fields
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
                        workflows: row.workflows.split(", "),
                    };
                }
            });
        });

        // delete the uploads that don't exist anymore
        const channelIds = channels.map((c: Channel) => c.channelId);
        const rowsToDelete = existingUploadsForFile
            .filter((u) => (!isNil(u.positionIndex) && !includes(positionIndexes, u.positionIndex)) ||
                (!isNil(u.channel) && !includes(channelIds, u.channelId)));
        const rowKeysToDelete = rowsToDelete.map(({file, positionIndex, channel}: UploadMetadata) =>
            getUploadRowKey(file, positionIndex, channel ? channel.channelId : undefined));

        next(batchActions([
            updateUploads(update),
            removeUploads(rowKeysToDelete),
        ]));
    },
    type: UPDATE_SCENES,
});

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
    retryUploadLogic,
    updateScenesLogic,
    updateSchemaLogic,
];
