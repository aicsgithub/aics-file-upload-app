import { expect } from "chai";
import { get } from "lodash";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { createMockReduxStore, fms, labkeyClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    mockAnnotationLookups,
    mockAnnotationOptions,
    mockAnnotations,
    mockAnnotationTypes,
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
} from "../../test/mocks";
import {
    requestAnnotations,
    requestMetadata,
    requestTemplates,
    retrieveOptionsForLookup,
    searchFileMetadata
} from "../actions";

import {
    getAnnotationLookups,
    getAnnotationOptions,
    getAnnotations,
    getAnnotationTypes,
    getBarcodePrefixes,
    getChannels,
    getFileMetadataSearchResults,
    getImagingSessions,
    getLookups,
    getOptionsForLookup,
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

            sandbox.replace(labkeyClient, "getAnnotationLookups", getAnnotationLookupsStub);
            sandbox.replace(labkeyClient, "getAnnotationTypes", getAnnotationTypesStub);
            sandbox.replace(labkeyClient, "getBarcodePrefixes", getBarcodePrefixesStub);
            sandbox.replace(labkeyClient, "getChannels", getChannelsStub);
            sandbox.replace(labkeyClient, "getImagingSessions", getImagingSessionsStub);
            sandbox.replace(labkeyClient, "getLookups", getLookupsStub);
            sandbox.replace(labkeyClient, "getUnits", getUnitsStub);
            sandbox.replace(labkeyClient, "getWorkflows", getWorkflowsStub);
            sandbox.replace(labkeyClient, "getUsers", getUsersStub);

            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
            const getImagingSessionsStub = stub().rejects();
            sandbox.replace(labkeyClient, "getImagingSessions", getImagingSessionsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
            sandbox.replace(labkeyClient, "getAnnotationOptions", getAnnotationOptionsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
                annotationLookups: mockAnnotationLookups,
                annotations: mockAnnotations,
            },
        };
        it("sets lookupOptions given OK response", async () => {
            const getOptionsStub = stub().resolves(mockLookupOptions);
            sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockStateWithAnnotations, mockReduxLogicDeps);

            let state = store.getState();
            expect(getOptionsForLookup(state)).to.be.undefined;

            store.dispatch(retrieveOptionsForLookup("Well"));

            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getOptionsForLookup(state)).to.not.be.empty;
        });
        it("sets lookupOptions given not OK response", async () => {
            const getOptionsStub = stub().rejects();
            sandbox.replace(labkeyClient, "getOptionsForLookup", getOptionsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockStateWithAnnotations, mockReduxLogicDeps);

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
            sandbox.replace(fms, "transformFileMetadataIntoTable", getSearchResultsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getFileMetadataSearchResults(state)).to.be.undefined;

            store.dispatch(searchFileMetadata({ annotation: "fake_user", searchValue: "mms" }));

            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getFileMetadataSearchResults(state)).to.not.be.undefined;
        });
        it("sets searchResults given user to search for", async () => {
            const getSearchResultsAsMapStub = stub().resolves({});
            sandbox.replace(fms, "getFilesByUser", getSearchResultsAsMapStub);
            const getSearchResultsStub = stub().resolves(mockSearchResults);
            sandbox.replace(fms, "transformFileMetadataIntoTable", getSearchResultsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

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
            sandbox.replace(fms, "transformFileMetadataIntoTable", getSearchResultsStub);
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(searchFileMetadata({ user: "fake_user" }));

            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
    });
});
