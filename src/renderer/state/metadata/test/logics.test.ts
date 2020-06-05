import { expect } from "chai";
import { get } from "lodash";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import {
  createMockReduxStore,
  fms,
  labkeyClient,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockAnnotationLookups,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockBarcodePrefixes,
  mockChannels,
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
import {
  requestAnnotations,
  requestBarcodeSearchResults,
  requestFileMetadataForJob,
  requestMetadata,
  requestTemplates,
  retrieveOptionsForLookup,
  searchFileMetadata,
} from "../actions";
import {
  getAnnotationLookups,
  getAnnotationOptions,
  getAnnotations,
  getAnnotationTypes,
  getBarcodePrefixes,
  getBarcodeSearchResults,
  getChannels,
  getFileMetadataForJob,
  getFileMetadataSearchResults,
  getImagingSessions,
  getLookups,
  getMetadata,
  getTemplates,
  getUnits,
  getUsers,
  getWorkflowOptions,
} from "../selectors";

describe("Metadata logics", () => {
  const sandbox = createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("requestMetadata", () => {
    it("sets metadata given OK response", async () => {
      const getAnnotationLookupsStub = stub().resolves(mockAnnotationLookups);
      const getAnnotationTypesStub = stub().resolves(mockAnnotationTypes);
      const getBarcodePrefixesStub = stub().resolves(mockBarcodePrefixes);
      const getChannelsStub = stub().resolves(mockChannels);
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

      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAnnotationLookups(state)).to.be.empty;
      expect(getAnnotationTypes(state)).to.be.empty;
      expect(getBarcodePrefixes(state)).to.be.empty;
      expect(getChannels(state)).to.be.empty;
      expect(getImagingSessions(state)).to.be.empty;
      expect(getLookups(state)).to.be.empty;
      expect(getUnits(state)).to.be.empty;
      expect(getWorkflowOptions(state)).to.be.empty;
      expect(getUsers(state)).to.be.empty;

      store.dispatch(requestMetadata());

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAnnotationLookups(state)).to.not.be.empty;
      expect(getAnnotationTypes(state)).to.not.be.empty;
      expect(getBarcodePrefixes(state)).to.not.be.empty;
      expect(getChannels(state)).to.not.be.empty;
      expect(getImagingSessions(state)).to.not.be.empty;
      expect(getLookups(state)).to.not.be.empty;
      expect(getUnits(state)).to.not.be.empty;
      expect(getWorkflowOptions(state)).to.not.be.empty;
      expect(getUsers(state)).to.not.be.empty;
    });
    it("sets alert given non-OK response", async () => {
      const getImagingSessionsStub = stub().rejects(
        "Failed to retrieve metadata"
      );
      sandbox.replace(
        labkeyClient,
        "getImagingSessions",
        getImagingSessionsStub
      );
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(requestMetadata());

      // after
      await logicMiddleware.whenComplete();
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(get(alert, "type")).to.equal(AlertType.ERROR);
      expect(get(alert, "message")).to.contain("Failed to retrieve metadata.");
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
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAnnotations(state)).to.be.empty;
      expect(getAnnotationOptions(state)).to.be.empty;

      store.dispatch(requestAnnotations());

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAnnotations(state)).to.not.be.empty;
      expect(getAnnotationOptions(state)).to.not.be.empty;
    });
    it("sets alert given not OK response", async () => {
      const getAnnotationsStub = stub().rejects();
      sandbox.replace(labkeyClient, "getAnnotations", getAnnotationsStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(requestAnnotations());

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
  });
  describe("requestTemplates", () => {
    it("sets templates given OK response", async () => {
      const getTemplatesStub = stub().resolves(mockAnnotations);
      sandbox.replace(labkeyClient, "getTemplates", getTemplatesStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAnnotations(state)).to.be.empty;

      store.dispatch(requestTemplates());

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getTemplates(state)).to.not.be.empty;
    });
    it("sets templates given not OK response", async () => {
      const getTemplatesStub = stub().rejects();
      sandbox.replace(labkeyClient, "getTemplates", getTemplatesStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(requestTemplates());

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
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
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithAnnotations,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getMetadata(state).Well).to.be.undefined;

      store.dispatch(retrieveOptionsForLookup("Well"));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getMetadata(state).Well).to.not.be.empty;
    });
    it("sets lookupOptions given not OK response", async () => {
      const getOptionsStub = stub().rejects();
      sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithAnnotations,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(retrieveOptionsForLookup("Well"));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
    it("sets error alert if annotation name is not defined", async () => {
      const getOptionsStub = stub().rejects();
      sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithAnnotations,
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(retrieveOptionsForLookup(""));
      await logicMiddleware.whenComplete();

      state = store.getState();
      const alert = getAlert(state);
      expect(alert).to.not.be.undefined;
      if (alert) {
        expect(alert.type).to.equal(AlertType.ERROR);
      }
    });
    it("sets error alert if annotation's lookup not found", async () => {
      const getOptionsStub = stub().rejects();
      sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
      const { logicMiddleware, store } = createMockReduxStore(
        {
          ...mockStateWithAnnotations,
          metadata: {
            ...mockStateWithAnnotations.metadata,
            lookups: [],
          },
        },
        mockReduxLogicDeps
      );

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(retrieveOptionsForLookup("Well"));

      await logicMiddleware.whenComplete();
      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
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
    it("sets barcodeSearchResults given good request", async () => {
      const getPlatesByBarcodeStub = stub().resolves([{}]);
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

      // apply
      store.dispatch(requestBarcodeSearchResults("35"));
      await logicMiddleware.whenComplete();

      // after
      expect(getBarcodeSearchResults(store.getState())).to.not.be.empty;
    });
    it("sets error alert given bad request", async () => {
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
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(requestBarcodeSearchResults("35"));
      await logicMiddleware.whenComplete();

      // after
      expect(getAlert(store.getState())).to.not.be.undefined;
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
