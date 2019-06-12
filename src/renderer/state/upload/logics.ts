import { UploadResponse } from "@aics/aicsfiles/type-declarations/types";
import { ipcRenderer } from "electron";
import Logger from "js-logger";
import { findIndex } from "lodash";
import { createLogic } from "redux-logic";

import {
    COPY_COMPLETE,
    RECEIVED_JOB_ID,
    START_UPLOAD,
    UPLOAD_FAILED,
    UPLOAD_FINISHED,
    UPLOAD_PROGRESS
} from "../../../shared/constants";
import { getWellLabel } from "../../util";
import { addEvent, addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { addJob, setCurrentJobName, setJobs, setUploadStatus } from "../job/actions";
import { getCurrentJobName, getJobs } from "../job/selectors";
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
    process: ({getState}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        ipcRenderer.on(UPLOAD_PROGRESS, (event: Event, jobName: string, status: string) => {
            dispatch(setUploadStatus(jobName, status));
        });
        ipcRenderer.on(COPY_COMPLETE, (jobName: string) => { // todo
            dispatch(removeRequestFromInProgress(AsyncRequest.COPY_FILES));
        });
        ipcRenderer.on(RECEIVED_JOB_ID, (event: Event, jobName: string, jobId: string) => {
            const state = getState();
            const jobs = [...getJobs(state)];
            const jobIndex = findIndex(jobs, {name: jobName});
            const jobToModify = jobs[jobIndex];
            if (jobToModify) {
                jobs[jobIndex] = {
                    ...jobToModify,
                    jobId,
                };
                dispatch(batchActions([
                    setJobs(jobs),
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

        ipcRenderer.send(START_UPLOAD, getUploadPayload(getState()), getCurrentJobName(getState()));
        ipcRenderer.on(UPLOAD_FINISHED, (event: Event, jobName: string, result: UploadResponse) => {
            Logger.debug("Upload Completed Successfully", result);
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.START_UPLOAD),
                addEvent("Upload Finished", AlertType.SUCCESS, new Date()),
            ]));

            done();
        });
        ipcRenderer.on(UPLOAD_FAILED, (event: Event, jobName: string, error: string) => {
            const currentJob = getCurrentJobName(getState());

            if (currentJob) {
                dispatch(batchActions([
                    removeRequestFromInProgress(AsyncRequest.START_UPLOAD),
                    setAlert({
                        message: `Upload Failed: ${error}`,
                        type: AlertType.ERROR,
                    }),
                    setUploadStatus(currentJob, `Upload Failed: ${error}`),
                ]));
            } else {
                throw Error("Received UPLOAD_FAILED event but there is no upload job currently");
            }

            done();
        });
    },
    transform: ({action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const now = new Date();
        const tempJobId = now.toISOString();
        const name = tempJobId;
        next(batchActions([
            addEvent("Starting upload", AlertType.INFO, now),
            addRequestToInProgress(AsyncRequest.START_UPLOAD),
            addRequestToInProgress(AsyncRequest.COPY_FILES),
            addJob({
                created: now,
                jobId: tempJobId,
                name,
                status: "Job Created",
            }),
            setCurrentJobName(name),
            action,
        ]));
    },
    type: INITIATE_UPLOAD,
});

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
];
