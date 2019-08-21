import { ipcRenderer } from "electron";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import LabkeyClient from "../../util/labkey-client";
import MMSClient from "../../util/mms-client";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";

import { ReduxLogicNextCb, ReduxLogicProcessDependencies, ReduxLogicTransformDependencies } from "../types";

import { OPEN_CREATE_PLATE_STANDALONE } from "../../../shared/constants";
import { receiveMetadata } from "./actions";
import {
    CREATE_BARCODE,
    GET_BARCODE_PREFIXES,
    GET_IMAGING_SESSIONS,
    REQUEST_METADATA,
    REQUEST_WORKFLOW_OPTIONS
} from "./constants";

const createBarcode = createLogic({
    transform: async ({httpClient, getState, action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const { prefixId, prefix } = action.payload;
            const barcode = await MMSClient.Create.barcode(httpClient, prefixId);
            ipcRenderer.send(OPEN_CREATE_PLATE_STANDALONE, barcode, prefix);
            next(action);
        } catch (ex) {
            next(setAlert({
                message: "Could not create barcode: " + ex.message,
                type: AlertType.ERROR,
            }));
        }
    },
    type: CREATE_BARCODE,
});

const requestMetadata = createLogic({
    process: async ({httpClient}: ReduxLogicProcessDependencies, dispatch: (action: AnyAction) => void,
                    done: () => void) => {
        try {
            const [ units, databaseMetadata ] = await Promise.all([
                LabkeyClient.Get.units(httpClient),
                LabkeyClient.Get.databaseMetadata(httpClient),
            ]);
            dispatch(receiveMetadata({
                databaseMetadata,
                units,
            }));
        } catch (reason) {
            console.log(reason); // tslint:disable-line:no-console
            dispatch(setAlert({
                message: "Failed to retrieve metadata.",
                type: AlertType.ERROR,
            }));
        }
        done();
    },
    type: REQUEST_METADATA,
});

const requestImagingSessions = createLogic({
    transform: async ({httpClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const imagingSessions = await LabkeyClient.Get.imagingSessions(httpClient);
            next(receiveMetadata({
                imagingSessions,
            }));
        } catch (ex) {
            next(setAlert({
                message: "Could not retrieve imaging session metadata",
                type: AlertType.ERROR,
            }));
        }
    },
    type: GET_IMAGING_SESSIONS,
});

const requestBarcodePrefixes = createLogic({
    transform: async ({httpClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const barcodePrefixes = await LabkeyClient.Get.barcodePrefixes(httpClient);
            next(receiveMetadata({
                barcodePrefixes,
            }));
        } catch (ex) {
            next(setAlert({
                message: "Could not retrieve barcode prefix metadata",
                type: AlertType.ERROR,
            }));
        }
    },
    type: GET_BARCODE_PREFIXES,
});

const requestWorkflows = createLogic({
    transform: async ({httpClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const workflowOptions = await LabkeyClient.Get.workflows(httpClient);
            next(receiveMetadata({
                workflowOptions,
            }));
        } catch (ex) {
            next(setAlert({
                message: "Could not retrieve workflow metadata",
                type: AlertType.ERROR,
            }));
        }
    },
    type: REQUEST_WORKFLOW_OPTIONS,
});

export default [
    createBarcode,
    requestMetadata,
    requestImagingSessions,
    requestBarcodePrefixes,
    requestWorkflows,
];
