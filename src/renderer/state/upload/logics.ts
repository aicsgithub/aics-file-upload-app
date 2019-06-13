import { UploadResponse } from "@aics/aicsfiles/type-declarations/types";
import { ipcRenderer } from "electron";
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
import { getWellLabel } from "../../util";
import { addEvent, setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { addJob, setCurrentJobName, updateJob } from "../job/actions";
import { getCurrentJobName } from "../job/selectors";
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

import { JobDoesNotExistError } from "../../errors/JobDoesNotExistError";
import { JobStatus } from "../job/types";

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
            dispatch(updateJob(jobName, { stage: status }));
        });
        ipcRenderer.on(COPY_COMPLETE, (event: Event, jobName: string) => {
            dispatch(updateJob(jobName, { copyComplete: true }));
        });
        ipcRenderer.on(RECEIVED_JOB_ID, (event: Event, jobName: string, jobId: string) => {
            dispatch(updateJob(jobName, { jobId }));
        });

        ipcRenderer.send(START_UPLOAD, getUploadPayload(getState()), getCurrentJobName(getState()));
        ipcRenderer.on(UPLOAD_FINISHED, (event: Event, jobName: string, result: UploadResponse) => {
            Logger.debug("Upload Completed Successfully", result);
            dispatch(batchActions([
                updateJob(jobName, { status: JobStatus.COMPLETE, stage: "Upload Complete" }),
                addEvent("Upload Finished", AlertType.SUCCESS, new Date()),
            ]));

            done();
        });
        ipcRenderer.on(UPLOAD_FAILED, (event: Event, jobName: string, error: string) => {
            const currentJob = getCurrentJobName(getState());

            if (currentJob) {
                dispatch(batchActions([
                    setAlert({
                        message: `Upload Failed: ${error}`,
                        type: AlertType.ERROR,
                    }),
                    updateJob(currentJob, { stage: `Upload Failed: ${error}`, status: JobStatus.FAILED }),
                ]));
            } else {
                throw new JobDoesNotExistError();
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
            addJob({
                copyComplete: false,
                created: now,
                jobId: tempJobId,
                name,
                stage: "Job Created",
                status: JobStatus.IN_PROGRESS,
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
