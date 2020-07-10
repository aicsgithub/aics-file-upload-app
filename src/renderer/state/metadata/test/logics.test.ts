import { expect } from "chai";
import { AnyAction } from "redux";
import { createSandbox, SinonStub, stub } from "sinon";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import {
  LabkeyPlateResponse,
  LabkeyTemplate,
} from "../../../services/labkey-client/types";
import { requestFailed } from "../../actions";
import { getAlert } from "../../feedback/selectors";
import {
  createMockReduxStore,
  fms,
  ipcRenderer,
  labkeyClient,
  mmsClient,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockAnnotationLookups,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockBarcodePrefixes,
  mockChannel,
  mockImagingSessions,
  mockLookupOptions,
  mockLookups,
  mockSearchResults,
  mockSelectedWorkflows,
  mockState,
  mockUnit,
  mockUsers,
  mockWellAnnotation,
} from "../../test/mocks";
import { AsyncRequest } from "../../types";
import {
  createBarcode,
  receiveMetadata,
  requestAnnotations,
  requestBarcodeSearchResults,
  requestFileMetadataForJob,
  requestMetadata,
  requestTemplates,
  retrieveOptionsForLookup,
  searchFileMetadata,
} from "../actions";
import {
  getBarcodeSearchResults,
  getFileMetadataForJob,
  getFileMetadataSearchResults,
} from "../selectors";

describe("Metadata logics", () => {
  const sandbox = createSandbox();
  const prefix = Object.freeze({
    description: "some prefix",
    prefixId: 1,
    prefix: "AD",
  });

  afterEach(() => {
    sandbox.restore();
  });

  const runRequestFailedTest = async (
    actionToDispatch: AnyAction,
    error: string,
    requestType: AsyncRequest | string,
    state = mockState
  ) => {
    const { actions, logicMiddleware, store } = createMockReduxStore(state);
    store.dispatch(actionToDispatch);
    await logicMiddleware.whenComplete();

    expect(actions.includesMatch(requestFailed(error, requestType))).to.be.true;
  };

  const runRequestSucceededTest = async (
    actionToDispatch: AnyAction,
    expectedAction: AnyAction,
    state = mockState
  ) => {
    const { actions, logicMiddleware, store } = createMockReduxStore(state);
    expect(actions.includesMatch(expectedAction)).to.be.false;

    store.dispatch(actionToDispatch);

    await logicMiddleware.whenComplete();
    expect(actions.includesMatch(expectedAction)).to.be.true;
  };

  describe("createBarcodeLogic", () => {
    let sendStub: SinonStub;

    beforeEach(() => {
      sendStub = stub();
      sandbox.replace(ipcRenderer, "send", sendStub);
    });
    it("sends a event on the OPEN_CREATE_PLATE_STANDALONE channel if it successfully creates a barcode", async () => {
      const createBarcodeStub = stub().resolves("fake");
      sandbox.replace(mmsClient, "createBarcode", createBarcodeStub);
      const { logicMiddleware, store } = createMockReduxStore();
      store.dispatch(createBarcode(prefix));
      await logicMiddleware.whenComplete();

      expect(sendStub.called).to.be.true;
    });
    it("dispatches requestFailed if request fails", async () => {
      const createBarcodeStub = stub().rejects(new Error("foo"));
      sandbox.replace(mmsClient, "createBarcode", createBarcodeStub);
      await runRequestFailedTest(
        createBarcode(prefix),
        "Could not create barcode: foo",
        AsyncRequest.CREATE_BARCODE
      );
      expect(sendStub.called).to.be.false;
    });
  });
  describe("requestMetadata", () => {
    it("sets metadata given OK response", async () => {
      const channels = [mockChannel];
      const getAnnotationLookupsStub = stub().resolves(mockAnnotationLookups);
      const getAnnotationTypesStub = stub().resolves(mockAnnotationTypes);
      const getBarcodePrefixesStub = stub().resolves(mockBarcodePrefixes);
      const getChannelsStub = stub().resolves(channels);
      const getImagingSessionsStub = stub().resolves(mockImagingSessions);
      const getLookupsStub = stub().resolves(mockLookups);
      const getUnitsStub = stub().resolves([mockUnit]);
      const getWorkflowsStub = stub().resolves(mockSelectedWorkflows);
      const getUsersStub = stub().resolves(mockUsers);

      sandbox.replace(
        labkeyClient,
        "getAnnotationLookups",
        getAnnotationLookupsStub
      );
      sandbox.replace(
        labkeyClient,
        "getAnnotationTypes",
        getAnnotationTypesStub
      );
      sandbox.replace(
        labkeyClient,
        "getBarcodePrefixes",
        getBarcodePrefixesStub
      );
      sandbox.replace(labkeyClient, "getChannels", getChannelsStub);
      sandbox.replace(
        labkeyClient,
        "getImagingSessions",
        getImagingSessionsStub
      );
      sandbox.replace(labkeyClient, "getLookups", getLookupsStub);
      sandbox.replace(labkeyClient, "getUnits", getUnitsStub);
      sandbox.replace(labkeyClient, "getWorkflows", getWorkflowsStub);
      sandbox.replace(labkeyClient, "getUsers", getUsersStub);

      const expectedAction = receiveMetadata({
        annotationLookups: mockAnnotationLookups,
        annotationTypes: mockAnnotationTypes,
        barcodePrefixes: mockBarcodePrefixes,
        channels: channels,
        imagingSessions: mockImagingSessions,
        lookups: mockLookups,
        units: [mockUnit],
        workflowOptions: mockSelectedWorkflows,
        users: mockUsers,
      });
      await runRequestSucceededTest(requestMetadata(), expectedAction);
    });
    it("dispatches requestFailed given non-OK response", async () => {
      const getImagingSessionsStub = stub().rejects(new Error("foo"));
      sandbox.replace(
        labkeyClient,
        "getImagingSessions",
        getImagingSessionsStub
      );
      await runRequestFailedTest(
        requestMetadata(),
        "Failed to retrieve metadata: foo",
        AsyncRequest.GET_METADATA
      );
    });
  });
  describe("requestAnnotations", () => {
    it("sets annotations given OK response", async () => {
      const getAnnotationsStub = stub().resolves(mockAnnotations);
      const getAnnotationOptionsStub = stub().resolves(mockAnnotationOptions);
      sandbox.replace(labkeyClient, "getAnnotations", getAnnotationsStub);
      sandbox.replace(
        labkeyClient,
        "getAnnotationOptions",
        getAnnotationOptionsStub
      );
      await runRequestSucceededTest(
        requestAnnotations(),
        receiveMetadata(
          {
            annotations: mockAnnotations,
            annotationOptions: mockAnnotationOptions,
          },
          AsyncRequest.GET_ANNOTATIONS
        )
      );
    });
    it("dispatches requestFailed given not OK response", async () => {
      const getAnnotationsStub = stub().rejects(new Error("foo"));
      sandbox.replace(labkeyClient, "getAnnotations", getAnnotationsStub);
      await runRequestFailedTest(
        requestAnnotations(),
        "Could not retrieve annotations: foo",
        AsyncRequest.GET_ANNOTATIONS
      );
    });
  });
  describe("requestTemplates", () => {
    it("sets templates given OK response", async () => {
      const templates: LabkeyTemplate[] = [];
      const getTemplatesStub = stub().resolves(mockAnnotations);
      sandbox.replace(labkeyClient, "getTemplates", getTemplatesStub);
      await runRequestSucceededTest(
        requestTemplates(),
        receiveMetadata({ templates }, AsyncRequest.GET_TEMPLATES)
      );
    });
    it("dispatches requestFailed given non-ok response", async () => {
      const getTemplatesStub = stub().rejects(new Error("foo"));
      sandbox.replace(labkeyClient, "getTemplates", getTemplatesStub);
      await runRequestFailedTest(
        requestTemplates(),
        "Could not retrieve templates: foo",
        AsyncRequest.GET_TEMPLATES
      );
    });
  });
  describe("requestOptionsForLookup", () => {
    const mockStateWithAnnotations = {
      ...mockState,
      metadata: {
        ...mockState.metadata,
        annotationLookups: [
          { annotationId: mockWellAnnotation.annotationId, lookupId: 1 },
        ],
        annotations: [mockWellAnnotation],
        lookups: [
          {
            ...mockAuditInfo,
            columnName: "wellId",
            descriptionColumn: "description",
            lookupId: 1,
            schemaName: "microscopy",
            tableName: "well",
          },
        ],
      },
    };
    it("sets lookupOptions given OK response", async () => {
      const getOptionsStub = stub().resolves(mockLookupOptions);
      sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
      await runRequestSucceededTest(
        retrieveOptionsForLookup(WELL_ANNOTATION_NAME),
        receiveMetadata(
          { Well: mockLookupOptions },
          AsyncRequest.GET_OPTIONS_FOR_LOOKUP
        ),
        mockStateWithAnnotations
      );
    });
    it("dispatches requestFailed given not OK response", async () => {
      const getOptionsStub = stub().rejects(new Error("foo"));
      sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
      await runRequestFailedTest(
        retrieveOptionsForLookup("Well"),
        "Could not retrieve options for lookup annotation: foo",
        AsyncRequest.GET_OPTIONS_FOR_LOOKUP,
        mockStateWithAnnotations
      );
    });
    it("dispatches requestFailed if annotation's lookup not found", async () => {
      const getOptionsStub = stub().resolves([]);
      sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
      await runRequestFailedTest(
        retrieveOptionsForLookup("Well"),
        "Could not retrieve options for lookup: could not find lookup. Contact Software.",
        AsyncRequest.GET_OPTIONS_FOR_LOOKUP,
        {
          ...mockStateWithAnnotations,
          metadata: {
            ...mockStateWithAnnotations.metadata,
            lookups: [],
          },
        }
      );
    });
  });
  describe("searchFileMetadataLogic", () => {
    it("sets searchResults given annotation and searchValue to search for", async () => {
      const getSearchResultsAsMapStub = stub().resolves({});
      sandbox.replace(fms, "getFilesByAnnotation", getSearchResultsAsMapStub);
      const getSearchResultsStub = stub().resolves(mockSearchResults);
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        getSearchResultsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getFileMetadataSearchResults(state)).to.be.undefined;

      store.dispatch(
        searchFileMetadata({ annotation: "fake_user", searchValue: "mms" })
      );

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getFileMetadataSearchResults(state)).to.not.be.undefined;
    });
    it("sets searchResults given user to search for", async () => {
      const getSearchResultsAsMapStub = stub().resolves({});
      sandbox.replace(fms, "getFilesByUser", getSearchResultsAsMapStub);
      const getSearchResultsStub = stub().resolves(mockSearchResults);
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        getSearchResultsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getFileMetadataSearchResults(state)).to.be.undefined;

      store.dispatch(searchFileMetadata({ user: "fake_user" }));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getFileMetadataSearchResults(state)).to.not.be.undefined;
    });
    it("sets searchResults given not OK response", async () => {
      const getSearchResultsAsMapStub = stub().resolves({});
      sandbox.replace(fms, "getFilesByAnnotation", getSearchResultsAsMapStub);
      const getSearchResultsStub = stub().rejects();
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        getSearchResultsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(searchFileMetadata({ user: "fake_user" }));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
    it("sets search results given template id", async () => {
      const getSearchResultsAsMapStub = stub().resolves({});
      sandbox.replace(fms, "getFilesByTemplate", getSearchResultsAsMapStub);
      const getSearchResultsStub = stub().resolves(mockSearchResults);
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        getSearchResultsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getFileMetadataSearchResults(state)).to.be.undefined;
      expect(getSearchResultsAsMapStub.called).to.be.false;

      store.dispatch(searchFileMetadata({ templateId: 1 }));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getFileMetadataSearchResults(state)).to.not.be.undefined;
      expect(getSearchResultsAsMapStub.called).to.be.true;
    });
  });
  describe("retrieveFileMetadataForJob", () => {
    it("sets fileMetadataForJob given OK response", async () => {
      const getSearchResultsAsMapStub = stub().resolves({ abc123: "blah" });
      sandbox.replace(
        fms,
        "getCustomMetadataForFile",
        getSearchResultsAsMapStub
      );
      const getSearchResultsStub = stub().resolves(mockSearchResults);
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        getSearchResultsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getFileMetadataForJob(state)).to.be.undefined;

      store.dispatch(requestFileMetadataForJob(["1", "2"]));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getFileMetadataForJob(state)).to.not.be.undefined;
    });
    it("sets alert given not OK response", async () => {
      const getSearchResultsAsMapStub = stub().rejects();
      sandbox.replace(
        fms,
        "getCustomMetadataForFile",
        getSearchResultsAsMapStub
      );
      const getSearchResultsStub = stub().rejects();
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        getSearchResultsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(requestFileMetadataForJob(["1", "2"]));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
  });
  describe("getBarcodeSearchResults", () => {
    it("dispatches receiveMetadata given good request", async () => {
      const barcodeSearchResults: LabkeyPlateResponse[] = [];
      const getPlatesByBarcodeStub = stub().resolves(barcodeSearchResults);
      sandbox.replace(
        labkeyClient,
        "getPlatesByBarcode",
        getPlatesByBarcodeStub
      );
      const expectedAction = receiveMetadata(
        { barcodeSearchResults },
        AsyncRequest.GET_BARCODE_SEARCH_RESULTS
      );
      await runRequestSucceededTest(
        requestBarcodeSearchResults("35"),
        expectedAction
      );
    });
    it("dispatches requestFailed given bad request", async () => {
      const getPlatesByBarcodeStub = stub().rejects(new Error("foo"));
      sandbox.replace(
        labkeyClient,
        "getPlatesByBarcode",
        getPlatesByBarcodeStub
      );
      await runRequestFailedTest(
        requestBarcodeSearchResults("35"),
        "Could not retrieve barcode search results: foo",
        AsyncRequest.GET_BARCODE_SEARCH_RESULTS
      );
    });
    it("doesn't request data if payload is empty", async () => {
      const getPlatesByBarcodeStub = stub().rejects();
      sandbox.replace(
        labkeyClient,
        "getPlatesByBarcode",
        getPlatesByBarcodeStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // before
      expect(getBarcodeSearchResults(store.getState())).to.be.empty;
      expect(getPlatesByBarcodeStub.called).to.be.false;

      // apply
      store.dispatch(requestBarcodeSearchResults("  "));
      await logicMiddleware.whenComplete();

      // after
      expect(getBarcodeSearchResults(store.getState())).to.be.empty;
      expect(getPlatesByBarcodeStub.called).to.be.false;
    });
  });
});
