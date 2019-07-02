import { UploadResponse } from "@aics/aicsfiles/type-declarations/types";
import Logger from "js-logger";
import { createLogic } from "redux-logic";

import {
    COPY_COMPLETE,
    RECEIVED_JOB_ID,
    START_UPLOAD,
    UPLOAD_FAILED,
    UPLOAD_FINISHED,
    UPLOAD_PROGRESS,
} from "../../../shared/constants";
import { addEvent, setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { addJob, updateJob } from "../job/actions";
import { deselectFiles } from "../selection/actions";
import { getSelectedBarcode } from "../selection/selectors";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { ASSOCIATE_FILES_AND_WELL, INITIATE_UPLOAD } from "./constants";
import { getUploadPayload } from "./selectors";

import { JobStatus } from "../job/types";

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
    type: ASSOCIATE_FILES_AND_WELL,
});

const initiateUploadLogic = createLogic({
    process: ({ctx, getState, ipcRenderer}: ReduxLogicProcessDependencies,
              dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        ipcRenderer.on(UPLOAD_PROGRESS, (event: Event, jobName: string, status: string) => {
            dispatch(updateJob(jobName, { stage: status }));
        });
        ipcRenderer.on(COPY_COMPLETE, (event: Event, jobName: string) => {
            dispatch(updateJob(jobName, { copyComplete: true }));
        });
        ipcRenderer.on(RECEIVED_JOB_ID, (event: Event, jobName: string, jobId: string) => {
            dispatch(updateJob(jobName, { jobId }));
        });
        ipcRenderer.on(UPLOAD_FINISHED, (event: Event, jobName: string, result: UploadResponse) => {
            Logger.debug("Upload Completed Successfully", result);
            dispatch(batchActions([
                updateJob(jobName, { status: JobStatus.COMPLETE, stage: "Upload Complete" }),
                addEvent("Upload Finished", AlertType.SUCCESS, new Date()),
            ]));

            done();
        });
        ipcRenderer.on(UPLOAD_FAILED, (event: Event, jobName: string, error: string) => {
            dispatch(setAlert({
                message: `Upload Failed: ${error}`,
                type: AlertType.ERROR,
            }));
            dispatch(updateJob(jobName, { stage: `Upload Failed: ${error}`, status: JobStatus.FAILED }));
            done();
        });
        ipcRenderer.send(START_UPLOAD, getUploadPayload(getState()), ctx.name);
    },
    transform: async ({action, ctx, fms, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            await fms.validateMetadata(getUploadPayload(getState()));
            const now = new Date();
            const tempJobId = now.toISOString();
            const name = tempJobId;
            ctx.name = name;
            next(batchActions([
                addEvent("Starting upload", AlertType.INFO, now),
                addJob({
                    copyComplete: false,
                    created: now,
                    jobId: tempJobId,
                    name,
                    stage: "Job Created",
                    status: JobStatus.IN_PROGRESS,
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
