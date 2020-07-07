import fs from "fs";

import { FileManagementSystem } from "@aics/aicsfiles";
import {
  FileToFileMetadata,
  ImageModelMetadata,
} from "@aics/aicsfiles/type-declarations/types";
import { ipcRenderer } from "electron";
import { isEmpty, sortBy, trim } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { OPEN_CREATE_PLATE_STANDALONE } from "../../../shared/constants";
import {
  Annotation,
  AnnotationLookup,
  Lookup,
} from "../../services/labkey-client/types";
import { getWithRetry, retrieveFileMetadata } from "../../util";
import {
  addRequestToInProgress,
  removeRequestFromInProgress,
  setAlert,
  setErrorAlert,
} from "../feedback/actions";
import {
  AlertType,
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";

import { receiveFileMetadata, receiveMetadata } from "./actions";
import {
  CREATE_BARCODE,
  EXPORT_FILE_METADATA,
  GET_ANNOTATIONS,
  GET_BARCODE_SEARCH_RESULTS,
  GET_OPTIONS_FOR_LOOKUP,
  GET_TEMPLATES,
  REQUEST_FILE_METADATA_FOR_JOB,
  REQUEST_METADATA,
  SEARCH_FILE_METADATA,
} from "./constants";
import {
  getAnnotationLookups,
  getAnnotations,
  getLookups,
  getSearchResultsHeader,
} from "./selectors";

const createBarcodeLogic = createLogic({
  transform: async (
    { getState, action, mmsClient }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    try {
      const {
        setting: { limsHost, limsPort },
      } = getState();
      const { prefixId, prefix } = action.payload;
      const barcode = await mmsClient.createBarcode(prefixId);
      ipcRenderer.send(
        OPEN_CREATE_PLATE_STANDALONE,
        limsHost,
        limsPort,
        barcode,
        prefix
      );
      next(action);
    } catch (ex) {
      next(
        setAlert({
          message: "Could not create barcode: " + ex.message,
          type: AlertType.ERROR,
        })
      );
    }
  },
  type: CREATE_BARCODE,
});

const requestMetadataLogic = createLogic({
  process: async (
    { labkeyClient, logger }: ReduxLogicProcessDependencies,
    dispatch: (action: AnyAction) => void,
    done: () => void
  ) => {
    try {
      const request = () =>
        Promise.all([
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
      ] = await getWithRetry(
        request,
        AsyncRequest.REQUEST_METADATA,
        dispatch,
        "LabKey",
        "Failed to retrieve metadata."
      );
      dispatch(
        receiveMetadata({
          annotationLookups,
          annotationTypes,
          barcodePrefixes,
          channels,
          imagingSessions,
          lookups,
          units,
          users,
          workflowOptions,
        })
      );
    } catch (e) {
      logger.error(e.message);
    }
    done();
  },
  type: REQUEST_METADATA,
});

const getBarcodeSearchResultsLogic = createLogic({
  debounce: 500,
  latest: true,
  process: async (
    { action, labkeyClient, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { payload: searchStr } = action;
    const request = () => labkeyClient.getPlatesByBarcode(searchStr);

    try {
      const barcodeSearchResults = await getWithRetry(
        request,
        AsyncRequest.GET_BARCODE_SEARCH_RESULTS,
        dispatch,
        "LabKey",
        "Could not retrieve barcode search results"
      );
      dispatch(receiveMetadata({ barcodeSearchResults }));
    } catch (e) {
      logger.error(e.message);
    }
    done();
  },
  type: GET_BARCODE_SEARCH_RESULTS,
  validate: (
    { action }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { payload } = action;
    const searchStr = trim(payload);
    if (!searchStr) {
      // Redux logic types don't allow undefined as an argument
      reject({ type: "ignore" });
    } else {
      next({
        ...action,
        payload: searchStr,
      });
    }
  },
});

const requestAnnotationsLogic = createLogic({
  process: async (
    { labkeyClient }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(addRequestToInProgress(AsyncRequest.GET_ANNOTATIONS));
    try {
      const annotations = sortBy(await labkeyClient.getAnnotations(), ["name"]);
      const annotationOptions = await labkeyClient.getAnnotationOptions();
      dispatch(
        batchActions([
          receiveMetadata({ annotationOptions, annotations }),
          removeRequestFromInProgress(AsyncRequest.GET_ANNOTATIONS),
        ])
      );
    } catch (e) {
      dispatch(
        batchActions([
          removeRequestFromInProgress(AsyncRequest.GET_ANNOTATIONS),
          setAlert({
            message: "Could not retrieve annotations: " + e.message,
            type: AlertType.ERROR,
          }),
        ])
      );
    }
    done();
  },
  type: GET_ANNOTATIONS,
});

const requestOptionsForLookupLogic = createLogic({
  debounce: 500,
  latest: true,
  process: async (
    {
      action: { payload },
      getState,
      labkeyClient,
      logger,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { lookupAnnotationName, searchStr } = payload;
    const state = getState();
    const annotations = getAnnotations(state);
    const annotationLookups = getAnnotationLookups(state);
    const lookups = getLookups(state);
    let lookup: Lookup | undefined;

    const annotation: Annotation | undefined = annotations.find(
      ({ name }) => name.toLowerCase() === lookupAnnotationName.toLowerCase()
    );
    if (annotation) {
      const annotationLookup:
        | AnnotationLookup
        | undefined = annotationLookups.find(
        (al) => al.annotationId === annotation.annotationId
      );
      if (annotationLookup) {
        lookup = lookups.find(
          ({ lookupId }) => lookupId === annotationLookup.lookupId
        );
      }
    }

    if (!lookup) {
      dispatch(
        setErrorAlert(
          "Could not retrieve options for lookup: could not find lookup. Contact Software."
        )
      );
      done();
      return;
    }

    const { columnName, schemaName, tableName } = lookup;
    try {
      const optionsForLookup = await getWithRetry(
        () =>
          labkeyClient.getOptionsForLookup(
            schemaName,
            tableName,
            columnName,
            searchStr
          ),
        AsyncRequest.GET_OPTIONS_FOR_LOOKUP,
        dispatch,
        "LabKey",
        "Could not retrieve options for lookup annotation"
      );
      dispatch(receiveMetadata({ [lookupAnnotationName]: optionsForLookup }));
    } catch (e) {
      logger.error(
        "Could not retrieve options for lookup annotation",
        e.message
      );
    }
    done();
  },
  type: GET_OPTIONS_FOR_LOOKUP,
  validate: (
    { action }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { lookupAnnotationName } = action.payload;

    if (isEmpty(lookupAnnotationName)) {
      reject(
        setErrorAlert(
          "Cannot retrieve options for lookup when lookupAnnotationName is not defined. Contact Software."
        )
      );
      return;
    }

    next(action);
  },
});

const requestTemplatesLogicLogic = createLogic({
  process: async (
    { labkeyClient, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      const templates = await getWithRetry(
        () => labkeyClient.getTemplates(),
        AsyncRequest.GET_TEMPLATES,
        dispatch,
        "LabKey",
        "Could not retrieve templates"
      );
      dispatch(receiveMetadata({ templates }));
    } catch (e) {
      logger.error("Could not retrieve templates", e);
    }
    done();
  },
  type: GET_TEMPLATES,
});

const innerJoinOrDefault = (
  fms: FileManagementSystem,
  defaultSearchResults: FileToFileMetadata,
  searchResultsAsMap?: FileToFileMetadata
): FileToFileMetadata => {
  if (!searchResultsAsMap) {
    return defaultSearchResults;
  }
  return FileManagementSystem.innerJoinFileMetadata(
    defaultSearchResults,
    searchResultsAsMap
  );
};

const searchFileMetadataLogic = createLogic({
  process: async (
    { action, fms }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(addRequestToInProgress(AsyncRequest.SEARCH_FILE_METADATA));
    try {
      const { annotation, searchValue, templateId, user } = action.payload;
      let searchResultsAsMap: FileToFileMetadata | undefined;
      if (annotation && searchValue) {
        searchResultsAsMap = await fms.getFilesByAnnotation(
          annotation,
          searchValue
        );
      }
      if (templateId) {
        const fileMetadataForTemplate = await fms.getFilesByTemplate(
          templateId
        );
        searchResultsAsMap = innerJoinOrDefault(
          fms,
          fileMetadataForTemplate,
          searchResultsAsMap
        );
      }
      if (user) {
        const fileMetadataForUser = await fms.getFilesByUser(user);
        searchResultsAsMap = innerJoinOrDefault(
          fms,
          fileMetadataForUser,
          searchResultsAsMap
        );
      }
      if (searchResultsAsMap) {
        const fileMetadataSearchResults = await fms.transformFileMetadataIntoTable(
          searchResultsAsMap
        );
        dispatch(
          batchActions([
            receiveMetadata({ fileMetadataSearchResults }),
            removeRequestFromInProgress(AsyncRequest.SEARCH_FILE_METADATA),
          ])
        );
      } else {
        dispatch(
          batchActions([
            removeRequestFromInProgress(AsyncRequest.SEARCH_FILE_METADATA),
            setAlert({
              message: "Could not perform search, no query params provided",
              type: AlertType.ERROR,
            }),
          ])
        );
      }
    } catch (e) {
      dispatch(
        batchActions([
          removeRequestFromInProgress(AsyncRequest.SEARCH_FILE_METADATA),
          setAlert({
            message: "Could not perform search: " + e.message,
            type: AlertType.ERROR,
          }),
        ])
      );
    }
    done();
  },
  type: SEARCH_FILE_METADATA,
});

const retrieveFileMetadataForJobLogic = createLogic({
  process: async (
    { action, fms }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const fileIds: string[] = action.payload;
    const request = () => retrieveFileMetadata(fileIds, fms);
    try {
      const fileMetadataForJob = await getWithRetry(
        request,
        AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB,
        dispatch,
        "Labkey or MMS"
      );
      dispatch(receiveFileMetadata(fileMetadataForJob));
    } catch (e) {
      dispatch(
        batchActions([
          removeRequestFromInProgress(
            AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
          ),
          setErrorAlert("Could retrieve metadata for job: " + e.message),
        ])
      );
    }
    done();
  },
  type: REQUEST_FILE_METADATA_FOR_JOB,
});

const exportFileMetadataLogic = createLogic({
  process: (
    { action, fms, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(addRequestToInProgress(AsyncRequest.EXPORT_FILE_METADATA));
    try {
      const filePath: string = action.payload;
      const state = getState();
      const tableHeader = getSearchResultsHeader(state);
      const {
        metadata: { fileMetadataSearchResults },
      } = state;
      if (fileMetadataSearchResults && tableHeader) {
        const header = tableHeader.map(({ title }) => title);
        const csv = fms.transformTableIntoCSV(
          header,
          fileMetadataSearchResults as ImageModelMetadata[]
        );
        fs.writeFileSync(filePath, csv);
        dispatch(
          batchActions([
            removeRequestFromInProgress(AsyncRequest.EXPORT_FILE_METADATA),
            setAlert({
              message: "Exported successfully",
              type: AlertType.SUCCESS,
            }),
          ])
        );
      }
    } catch (e) {
      dispatch(
        batchActions([
          removeRequestFromInProgress(AsyncRequest.EXPORT_FILE_METADATA),
          setAlert({
            message: "Could not export: " + e.message,
            type: AlertType.ERROR,
          }),
        ])
      );
    }
    done();
  },
  type: EXPORT_FILE_METADATA,
});

export default [
  createBarcodeLogic,
  exportFileMetadataLogic,
  requestAnnotationsLogic,
  getBarcodeSearchResultsLogic,
  retrieveFileMetadataForJobLogic,
  requestMetadataLogic,
  requestOptionsForLookupLogic,
  requestTemplatesLogicLogic,
  searchFileMetadataLogic,
];
