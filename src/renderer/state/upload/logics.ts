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
import {
    addEvent,
    addRequestToInProgress,
    removeRequestFromInProgress,
    setAlert,
    setUploadStatus
} from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
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
            // tslint:disable-next-line
            console.log("UPLOAD_PROGRESS", status);
            dispatch(setUploadStatus(status));
        });
        ipcRenderer.on(RECEIVED_JOB_ID, (event: Event, jobId: string) => {
            // dispatch(setCurrentJobId(jobId));
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
        next(batchActions([
            addEvent("Starting upload", AlertType.INFO, new Date()),
            addRequestToInProgress(AsyncRequest.START_UPLOAD),
            action,
        ]));
    },
    type: INITIATE_UPLOAD,
});

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
];
