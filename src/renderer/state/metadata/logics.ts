import { ipcRenderer } from "electron";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { OPEN_CREATE_PLATE_STANDALONE } from "../../../shared/constants";

import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";

import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { receiveMetadata } from "./actions";
import {
    CREATE_BARCODE,
    GET_BARCODE_SEARCH_RESULTS,
    REQUEST_METADATA,
} from "./constants";

const createBarcode = createLogic({
    transform: async ({getState, action, mmsClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const { prefixId, prefix } = action.payload;
            const barcode = await mmsClient.createBarcode(prefixId);
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
    process: async ({labkeyClient}: ReduxLogicProcessDependencies, dispatch: (action: AnyAction) => void,
                    done: () => void) => {
        try {
            const [
                barcodePrefixes,
                databaseMetadata,
                imagingSessions,
                units,
                workflowOptions,
            ] = await Promise.all([
                labkeyClient.getBarcodePrefixes(),
                labkeyClient.getDatabaseMetadata(),
                labkeyClient.getImagingSessions(),
                labkeyClient.getUnits(),
                labkeyClient.getWorkflows(),

            ]);
            dispatch(receiveMetadata({
                barcodePrefixes,
                databaseMetadata,
                imagingSessions,
                units,
                workflowOptions,
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

const requestBarcodes = createLogic({
    process: async ({action, labkeyClient}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const { payload: searchStr } = action;
        if (!searchStr) {
            dispatch(receiveMetadata({
                barcodeSearchResults: [],
            }));
            done();
        } else {
            dispatch(addRequestToInProgress(AsyncRequest.GET_BARCODE_SEARCH_RESULTS));
            try {
                const searchResults = await labkeyClient.getPlatesByBarcode(action.payload);
                dispatch(batchActions([
                    receiveMetadata({barcodeSearchResults: searchResults}),
                    removeRequestFromInProgress(AsyncRequest.GET_BARCODE_SEARCH_RESULTS),
                ]));

            } catch (e) {
                dispatch(batchActions([
                    removeRequestFromInProgress(AsyncRequest.GET_BARCODE_SEARCH_RESULTS),
                    setAlert({
                        message: e.message || "Could not retrieve barcode search results",
                        type: AlertType.ERROR,
                    }),
                ]));
            }
            done();
        }
    },
    type: GET_BARCODE_SEARCH_RESULTS,
});

export default [
    createBarcode,
    requestBarcodes,
    requestMetadata,
];
