import { ipcRenderer } from "electron";
import fs from "fs";
import { sortBy, startCase, omit } from "lodash";
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
    EXPORT_FILE_METADATA,
    GET_ANNOTATIONS,
    GET_BARCODE_SEARCH_RESULTS,
    GET_OPTIONS_FOR_LOOKUP,
    GET_TEMPLATES,
    REQUEST_METADATA,
    SEARCH_FILE_METADATA,
} from "./constants";
import { FileToFileMetadata } from "@aics/aicsfiles/type-declarations/types";

const createBarcode = createLogic({
    transform: async ({getState, action, mmsClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const { setting: { limsHost, limsPort } } = getState();
            const { prefixId, prefix } = action.payload;
            const barcode = await mmsClient.createBarcode(prefixId);
            ipcRenderer.send(OPEN_CREATE_PLATE_STANDALONE, limsHost, limsPort, barcode, prefix);
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
                channels,
                imagingSessions,
                lookups,
                units,
                users,
                workflowOptions,
            ] = await Promise.all([
                labkeyClient.getAnnotationLookups(),
                labkeyClient.getAnnotationTypes(),
                labkeyClient.getBarcodePrefixes(),
                labkeyClient.getChannels(),
                labkeyClient.getImagingSessions(),
                labkeyClient.getLookups(),
                labkeyClient.getUnits(),
                labkeyClient.getUsers(),
                labkeyClient.getWorkflows(),
            ]);
            dispatch(receiveMetadata({
                annotationLookups,
                annotationTypes,
                barcodePrefixes,
                channels,
                imagingSessions,
                lookups,
                units,
                users,
                workflowOptions,
            }));
        } catch (reason) {
            dispatch(setAlert({
                message: "Failed to retrieve metadata. " + reason.message,
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
            const annotationOptions = await labkeyClient.getAnnotationOptions();
            dispatch(batchActions([
                receiveMetadata({annotationOptions, annotations}),
                removeRequestFromInProgress(AsyncRequest.GET_ANNOTATIONS),
            ]));
        } catch (e) {
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.GET_ANNOTATIONS),
                setAlert({
                    message: "Could not retrieve annotations: " + e.message,
                    type: AlertType.ERROR,
                }),
            ]));
        }
        done();
    },
    type: GET_ANNOTATIONS,
});

const requestOptionsForLookup = createLogic({
    process: async ({ action: { payload }, getState, labkeyClient }: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        if (payload) {
            try {
                dispatch(addRequestToInProgress(AsyncRequest.GET_OPTIONS_FOR_LOOKUP));
                const { metadata: { annotationLookups, annotations } } = getState();
                const annotationOption = annotations.find(({ name }) => name === payload);
                const lookup = annotationOption &&
                    annotationLookups.find(({ annotationId }) => annotationId === annotationOption.annotationId);
                let optionsForLookup;
                if (lookup) {
                    optionsForLookup = await labkeyClient.getOptionsForLookup(lookup.lookupId);
                    optionsForLookup.sort();
                }

                dispatch(batchActions([
                    receiveMetadata({ optionsForLookup }),
                    removeRequestFromInProgress(AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
                ]));
            } catch (e) {
                dispatch(batchActions([
                    removeRequestFromInProgress(AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
                    setAlert({
                        message: "Could not retrieve options for lookup annotation: " + e.message,
                        type: AlertType.ERROR,
                    }),
                ]));
            }
        }
        done();
    },
    type: GET_OPTIONS_FOR_LOOKUP,
});

const requestTemplates = createLogic({
    process: async ({action, labkeyClient}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        dispatch(addRequestToInProgress(AsyncRequest.GET_TEMPLATES));
        try {
            const templates = sortBy(await labkeyClient.getTemplates(), ["name"]);
            dispatch(batchActions([
                receiveMetadata({templates}),
                removeRequestFromInProgress(AsyncRequest.GET_TEMPLATES),
            ]));
        } catch (e) {
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.GET_TEMPLATES),
                setAlert({
                    message: "Could not retrieve templates: " + e.message,
                    type: AlertType.ERROR,
                }),
            ]));
        }
        done();
    },
    type: GET_TEMPLATES,
});

const searchFileMetadataLogic = createLogic({
    process: async ({ action, fms }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const { annotation, searchValue, template, user } = action.payload;
        dispatch(addRequestToInProgress(AsyncRequest.SEARCH_FILE_METADATA));
        try {
            let fileMetadataSearchResultsAsMap: FileToFileMetadata | undefined = undefined;
            if (annotation && searchValue) {
                fileMetadataSearchResultsAsMap = await fms.getFilesByAnnotation(annotation, searchValue);
            }
            if (template) {
                const fileMetadataForTemplate = await fms.getFilesByTemplate(template);
                fileMetadataSearchResultsAsMap = fms.innerJoinFileMetadata(fileMetadataForTemplate, fileMetadataSearchResultsAsMap);
            }
            if (user) {
                const fileMetadataForUser = await fms.getFilesByUser(user);
                fileMetadataSearchResultsAsMap = fms.innerJoinFileMetadata(fileMetadataForUser, fileMetadataSearchResultsAsMap);
            }
            if (fileMetadataSearchResultsAsMap) {
                console.log("fileMetadataSearchResultsAsMap:", fileMetadataSearchResultsAsMap);
                const fileMetadataSearchResults = await fms.transformFileMetadataIntoTable(fileMetadataSearchResultsAsMap);
                console.log('fileMetadataSearchResults:', fileMetadataSearchResults);
                dispatch(batchActions([
                    receiveMetadata({ fileMetadataSearchResults }),
                    removeRequestFromInProgress(AsyncRequest.SEARCH_FILE_METADATA),
                ]));
            } else {
                dispatch(batchActions([
                    removeRequestFromInProgress(AsyncRequest.SEARCH_FILE_METADATA),
                    setAlert({
                        message: "Could not perform search, no query params provided",
                        type: AlertType.ERROR,
                    }),
                ]));
            }
        } catch (e) {
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.SEARCH_FILE_METADATA),
                setAlert({
                    message: "Could not perform search: " + e.message,
                    type: AlertType.ERROR,
                }),
            ]));
        }
        done();
    },
    type: SEARCH_FILE_METADATA,
});

const exportFileMetadata = createLogic({
    process: async ({ action, fms, getState }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        dispatch(addRequestToInProgress(AsyncRequest.EXPORT_FILE_METADATA));
        try {
            const { payload } = action;
            const { metadata: { fileMetadataSearchResults } } = getState();
            if (fileMetadataSearchResults) {
                const fileMetadataCsv = await fms.transformTableIntoCSV(["fileId", "workflow"].map((title) => startCase(title)), fileMetadataSearchResults);
                const exportData = await fms.transformTableIntoCSV(fileMetadataSearchResults);
                await fs.writeFileSync(payload, exportData);
                dispatch(batchActions([
                    removeRequestFromInProgress(AsyncRequest.EXPORT_FILE_METADATA),
                    setAlert({
                        message: "Exported successfully",
                        type: AlertType.SUCCESS,
                    }),
                ]));
            }
        } catch (e) {
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.EXPORT_FILE_METADATA),
                setAlert({
                    message: "Could not export: " + e.message,
                    type: AlertType.ERROR,
                }),
            ]));
        }
        done();
    },
    type: EXPORT_FILE_METADATA,
});

export default [
    createBarcode,
    exportFileMetadata,
    requestAnnotations,
    requestBarcodes,
    requestMetadata,
    requestOptionsForLookup,
    requestTemplates,
    searchFileMetadataLogic,
];
