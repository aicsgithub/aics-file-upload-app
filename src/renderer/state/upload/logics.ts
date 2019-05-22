import { UploadResponse } from "@aics/aicsfiles/type-declarations/types";
import { ipcRenderer } from "electron";
import Logger from "js-logger";
import { createLogic } from "redux-logic";

import {
    RECEIVED_JOB_ID,
    START_UPLOAD,
    UPLOAD_FAILED,
    UPLOAD_FINISHED,
    UPLOAD_PROGRESS
} from "../../../shared/constants";
import { getWellLabel } from "../../util";
import { addEvent, addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { addJob, setCurrentJobId, setJobs, setUploadStatus } from "../job/actions";
import { getCurrentJob, getCurrentJobIndex, getJobs } from "../job/selectors";
import { deselectFiles } from "../selection/actions";
import { getSelectedBarcode, getWell } from "../selection/selectors";
import { ReduxLogicDependencies, ReduxLogicDoneCb, ReduxLogicNextCb, ReduxLogicTransformDependencies } from "../types";
import { batchActions } from "../util";
import { ASSOCIATE_FILES_AND_WELL, INITIATE_UPLOAD } from "./constants";
import { getUploadPayload } from "./selectors";

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
    process: ({getState}: ReduxLogicDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        ipcRenderer.on(UPLOAD_PROGRESS, (event: Event, status: string) => {
            dispatch(setUploadStatus(status));
        });
        ipcRenderer.on(RECEIVED_JOB_ID, (event: Event, jobId: string) => {
            const state = getState();
            const jobs = getJobs(state);
            const currentJobIndex = getCurrentJobIndex(state);
            const currentJob = getCurrentJob(state);
            if (currentJob && currentJobIndex > -1) {
                jobs[currentJobIndex] = {
                    ...currentJob,
                    jobId,
                };
                dispatch(batchActions([
                    setJobs(jobs),
                    setCurrentJobId(jobId),
                ]));
            } else {
                const error = "Cannot set current job id. Current job has not been initialized.";
                dispatch(setAlert({
                    message: error,
                    type: AlertType.ERROR,
                }));
                throw new Error(error);
            }
        });

        ipcRenderer.send(START_UPLOAD, getUploadPayload(getState()));
        ipcRenderer.on(UPLOAD_FINISHED, (event: Event, result: UploadResponse) => {
            Logger.debug("Upload Completed Successfully", result);
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.START_UPLOAD),
                addEvent("Upload Finished", AlertType.SUCCESS, new Date()),
            ]));

            done();
        });
        ipcRenderer.on(UPLOAD_FAILED, (event: Event, error: string) => {
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.START_UPLOAD),
                setAlert({
                    message: `Upload Failed: ${error}`,
                    type: AlertType.ERROR,
                }),
                setUploadStatus(`Upload Failed: ${error}`),
            ]));

            done();
        });
    },
    transform: ({action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const tempJobId = (new Date()).toISOString();
        next(batchActions([
            addEvent("Starting upload", AlertType.INFO, new Date()),
            addRequestToInProgress(AsyncRequest.START_UPLOAD),
            addJob({
                created: new Date(),
                jobId: tempJobId,
                status: "Job Created",
            }),
            setCurrentJobId(tempJobId),
            action,
        ]));
    },
    type: INITIATE_UPLOAD,
});

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
];
