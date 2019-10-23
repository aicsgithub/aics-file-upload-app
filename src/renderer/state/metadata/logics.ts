import { ipcRenderer } from "electron";
import { sortBy } from "lodash";
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
import { CREATE_BARCODE, GET_ANNOTATIONS, GET_BARCODE_SEARCH_RESULTS, REQUEST_METADATA } from "./constants";

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
                annotationLookups,
                annotationTypes,
                barcodePrefixes,
                databaseMetadata,
                imagingSessions,
                lookups,
                templates,
                units,
                workflowOptions,
            ] = await Promise.all([
                labkeyClient.getAnnotationLookups(),
                labkeyClient.getAnnotationTypes(),
                labkeyClient.getBarcodePrefixes(),
                labkeyClient.getDatabaseMetadata(),
                labkeyClient.getImagingSessions(),
                labkeyClient.getLookups(),
                labkeyClient.getTemplates(),
                labkeyClient.getUnits(),
                labkeyClient.getWorkflows(),

            ]);
            dispatch(receiveMetadata({
                annotationLookups,
                annotationTypes,
                barcodePrefixes,
                databaseMetadata,
                imagingSessions,
                lookups,
                templates,
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
                const searchResults = await labkeyClient.getPlatesByBarcode(searchStr);
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

const requestAnnotations = createLogic({
    process: async ({action, labkeyClient}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        dispatch(addRequestToInProgress(AsyncRequest.GET_ANNOTATIONS));
        try {
            const annotations = sortBy(await labkeyClient.getAnnotations(), ["name"]);
            dispatch(batchActions([
                receiveMetadata({annotations}),
                removeRequestFromInProgress(AsyncRequest.GET_ANNOTATIONS),
            ]));
        } catch (e) {
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.GET_ANNOTATIONS),
                setAlert({
                    message: e.message || "Could not retrieve annotations",
                    type: AlertType.ERROR,
                }),
            ]));
        }
        done();
    },
    type: GET_ANNOTATIONS,
});

export default [
    createBarcode,
    requestAnnotations,
    requestBarcodes,
    requestMetadata,
];
