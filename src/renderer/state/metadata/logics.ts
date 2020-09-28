import fs from "fs";

import { isEmpty, trim } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { OPEN_CREATE_PLATE_STANDALONE } from "../../../shared/constants";
import { FileManagementSystem } from "../../services/aicsfiles";
import {
  FileToFileMetadata,
  ImageModelMetadata,
} from "../../services/aicsfiles/types";
import {
  Annotation,
  AnnotationLookup,
  Lookup,
} from "../../services/labkey-client/types";
import { requestFailed } from "../actions";
import { setErrorAlert } from "../feedback/actions";
import { getWithRetry } from "../feedback/util";
import {
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
} from "../types";

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
import {
  getAnnotationLookups,
  getAnnotations,
  getLookups,
  getSearchResultsHeader,
} from "./selectors";
import { CreateBarcodeAction, GetOptionsForLookupAction } from "./types";

const createBarcodeLogic = createLogic({
  process: async (
    {
      action,
      getState,
      ipcRenderer,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<CreateBarcodeAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
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
    } catch (ex) {
      const error = "Could not create barcode: " + ex.message;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.CREATE_BARCODE));
    }
    done();
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
      ] = await getWithRetry(request, dispatch);
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
      dispatch(
        requestFailed(
          `Failed to retrieve metadata: ${e.message}`,
          AsyncRequest.GET_METADATA
        )
      );
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
      const barcodeSearchResults = await getWithRetry(request, dispatch);
      dispatch(
        receiveMetadata(
          { barcodeSearchResults },
          AsyncRequest.GET_BARCODE_SEARCH_RESULTS
        )
      );
    } catch (e) {
      const error = `Could not retrieve barcode search results: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.GET_BARCODE_SEARCH_RESULTS));
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
    try {
      const request = () =>
        Promise.all([
          labkeyClient.getAnnotations(),
          labkeyClient.getAnnotationOptions(),
        ]);
      const [annotations, annotationOptions] = await getWithRetry(
        request,
        dispatch
      );
      dispatch(
        receiveMetadata(
          { annotationOptions, annotations },
          AsyncRequest.GET_ANNOTATIONS
        )
      );
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not retrieve annotations: ${e.message}`,
          AsyncRequest.GET_ANNOTATIONS
        )
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
    }: ReduxLogicProcessDependenciesWithAction<GetOptionsForLookupAction>,
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
        requestFailed(
          "Could not retrieve options for lookup: could not find lookup. Contact Software.",
          AsyncRequest.GET_OPTIONS_FOR_LOOKUP
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
        dispatch
      );
      dispatch(
        receiveMetadata(
          { [lookupAnnotationName]: optionsForLookup },
          AsyncRequest.GET_OPTIONS_FOR_LOOKUP
        )
      );
    } catch (e) {
      const error = `Could not retrieve options for lookup annotation: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.GET_OPTIONS_FOR_LOOKUP));
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
        dispatch
      );
      dispatch(receiveMetadata({ templates }, AsyncRequest.GET_TEMPLATES));
    } catch (e) {
      const error = `Could not retrieve templates: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.GET_TEMPLATES));
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
    { action, fms, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
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
          receiveMetadata(
            { fileMetadataSearchResults },
            AsyncRequest.SEARCH_FILE_METADATA
          )
        );
      } else {
        const error = "Could not perform search, no query params provided";
        logger.error(error);
        dispatch(requestFailed(error, AsyncRequest.SEARCH_FILE_METADATA));
      }
    } catch (e) {
      const error = `Could not perform search: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.SEARCH_FILE_METADATA));
    }
    done();
  },
  type: SEARCH_FILE_METADATA,
});

const exportFileMetadataLogic = createLogic({
  process: (
    { action, fms, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
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
        // nothing to write to state but need to remove request
        dispatch(receiveMetadata({}, AsyncRequest.EXPORT_FILE_METADATA));
      }
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not export: ${e.message}`,
          AsyncRequest.EXPORT_FILE_METADATA
        )
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
  requestMetadataLogic,
  requestOptionsForLookupLogic,
  requestTemplatesLogicLogic,
  searchFileMetadataLogic,
];
