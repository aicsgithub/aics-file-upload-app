import { UploadResponse } from "@aics/aicsfiles/type-declarations/types";
import Logger from "js-logger";
import { createLogic } from "redux-logic";

import {
    RECEIVED_JOB_ID,
    START_UPLOAD,
    UPLOAD_FAILED,
    UPLOAD_FINISHED,
    UPLOAD_PROGRESS,
} from "../../../shared/constants";
import { getWellLabel } from "../../util";
import { addEvent, setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { removePendingJob, addPendingJob, retrieveJobs } from "../job/actions";
import { deselectFiles } from "../selection/actions";
import { getSelectedBarcode, getWell } from "../selection/selectors";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { ASSOCIATE_FILES_AND_WELL, INITIATE_UPLOAD } from "./constants";
import { getUploadJobName, getUploadPayload } from "./selectors";

const associateFileAndWellLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const state = getState();
        action.payload = {
            ...action.payload,
            barcode: getSelectedBarcode(state),
            wellLabel: getWellLabel(getWell(state)),
        };
        next(batchActions([
            action,
            deselectFiles(),
        ]));
    },
    type: ASSOCIATE_FILES_AND_WELL,
});

const initiateUploadLogic = createLogic({
    process: ({ctx, getState, ipcRenderer}: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        ipcRenderer.on(UPLOAD_PROGRESS, (event: Event, jobName: string, currentStage: string) => {
            Logger.debug(`UPLOAD_PROGRESS for jobName=${jobName}, updating currentStage to ${currentStage}`);
            dispatch(retrieveJobs());
        });
        ipcRenderer.on(RECEIVED_JOB_ID, () => {
            dispatch(retrieveJobs());
            dispatch(removePendingJob(ctx.name));
        });
        ipcRenderer.on(UPLOAD_FINISHED, (event: Event, jobName: string, result: UploadResponse) => {
            Logger.debug(`UPLOAD_FINISHED for jobName=${jobName} with result:`, result);
            dispatch(retrieveJobs());
            dispatch(addEvent("Upload Finished", AlertType.SUCCESS, new Date()));
            dispatch(removePendingJob(ctx.name));
            done();
        });
        ipcRenderer.on(UPLOAD_FAILED, (event: Event, jobName: string, error: string) => {
            Logger.error(`UPLOAD_FAILED for jobName=${jobName}`, error);
            dispatch(retrieveJobs());
            dispatch(setAlert({
                message: `Upload Failed: ${error}`,
                type: AlertType.ERROR,
            }));
            dispatch(removePendingJob(ctx.name));
            done();
        });
        ipcRenderer.send(START_UPLOAD, getUploadPayload(getState()), ctx.name);
        dispatch(addPendingJob(ctx.name));
    },
    transform: async ({action, ctx, fms, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            await fms.validateMetadata(getUploadPayload(getState()));
            ctx.name = getUploadJobName(getState());
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

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
];
