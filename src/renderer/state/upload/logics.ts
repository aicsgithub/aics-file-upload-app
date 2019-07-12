import { UploadResponse } from "@aics/aicsfiles/type-declarations/types";
import Logger from "js-logger";
import { userInfo } from "os";
import { createLogic } from "redux-logic";

import {
    START_UPLOAD,
    UPLOAD_FAILED,
    UPLOAD_FINISHED,
} from "../../../shared/constants";
import { addEvent, setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { addPendingJob, removePendingJobs } from "../job/actions";
import { deselectFiles } from "../selection/actions";
import { getSelectedBarcode } from "../selection/selectors";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { ASSOCIATE_FILES_AND_WELLS, INITIATE_UPLOAD } from "./constants";
import { getUploadJobName, getUploadPayload } from "./selectors";

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

const initiateUploadLogic = createLogic({
    process: ({ctx, getState, ipcRenderer}: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        ipcRenderer.on(UPLOAD_FINISHED, (event: Event, jobName: string, result: UploadResponse) => {
            Logger.debug(`UPLOAD_FINISHED for jobName=${jobName} with result:`, result);
            dispatch(addEvent("Upload Finished", AlertType.SUCCESS, new Date()));
            dispatch(removePendingJobs(ctx.name));
            done();
        });
        ipcRenderer.on(UPLOAD_FAILED, (event: Event, jobName: string, error: string) => {
            Logger.error(`UPLOAD_FAILED for jobName=${jobName}`, error);
            dispatch(setAlert({
                message: `Upload Failed: ${error}`,
                type: AlertType.ERROR,
            }));
            dispatch(removePendingJobs(ctx.name));
            done();
        });
        ipcRenderer.send(START_UPLOAD, getUploadPayload(getState()), ctx.name);
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

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
];
