import { expect } from "chai";
import { get } from "lodash";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { createMockReduxStore, labkeyClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    mockAnnotationLookups,
    mockAnnotationOptions,
    mockAnnotations,
    mockAnnotationTypes,
    mockBarcodePrefixes,
    mockChannels,
    mockImagingSessions,
    mockLookups,
    mockSelectedWorkflows,
    mockState,
    mockUnit,
} from "../../test/mocks";
import { requestAnnotations, requestMetadata, requestTemplates } from "../actions";

import {
    getAnnotationLookups,
    getAnnotationOptions,
    getAnnotations,
    getAnnotationTypes,
    getBarcodePrefixes,
    getChannels,
    getImagingSessions,
    getLookups,
    getTemplates,
    getUnits,
    getWorkflowOptions,
} from "../selectors";

describe("Metadata logics", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("requestMetadata", () => {
        it("sets metadata given OK response", (done) => {
            const getAnnotationLookupsStub = stub().resolves(mockAnnotationLookups);
            const getAnnotationTypesStub = stub().resolves(mockAnnotationTypes);
            const getBarcodePrefixesStub = stub().resolves(mockBarcodePrefixes);
            const getChannelsStub = stub().resolves(mockChannels);
            const getImagingSessionsStub = stub().resolves(mockImagingSessions);
            const getLookupsStub = stub().resolves(mockLookups);
            const getUnitsStub = stub().resolves([mockUnit]);
            const getWorkflowsStub = stub().resolves(mockSelectedWorkflows);

            sandbox.replace(labkeyClient, "getAnnotationLookups", getAnnotationLookupsStub);
            sandbox.replace(labkeyClient, "getAnnotationTypes", getAnnotationTypesStub);
            sandbox.replace(labkeyClient, "getBarcodePrefixes", getBarcodePrefixesStub);
            sandbox.replace(labkeyClient, "getChannels", getChannelsStub);
            sandbox.replace(labkeyClient, "getImagingSessions", getImagingSessionsStub);
            sandbox.replace(labkeyClient, "getLookups", getLookupsStub);
            sandbox.replace(labkeyClient, "getUnits", getUnitsStub);
            sandbox.replace(labkeyClient, "getWorkflows", getWorkflowsStub);

            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getAnnotationLookups(state)).to.be.empty;
            expect(getAnnotationTypes(state)).to.be.empty;
            expect(getBarcodePrefixes(state)).to.be.empty;
            expect(getChannels(state)).to.be.empty;
            expect(getImagingSessions(state)).to.be.empty;
            expect(getLookups(state)).to.be.empty;
            expect(getUnits(state)).to.be.empty;
            expect(getWorkflowOptions(state)).to.be.empty;

            store.dispatch(requestMetadata());

            // todo FMS-669 stop using subscribe to test multi-dispatch logics
            store.subscribe(() => {
                state = store.getState();
                expect(getAnnotationLookups(state)).to.not.be.empty;
                expect(getAnnotationTypes(state)).to.not.be.empty;
                expect(getBarcodePrefixes(state)).to.not.be.empty;
                expect(getChannels(state)).to.not.be.empty;
                expect(getImagingSessions(state)).to.not.be.empty;
                expect(getLookups(state)).to.not.be.empty;
                expect(getUnits(state)).to.not.be.empty;
                expect(getWorkflowOptions(state)).to.not.be.empty;
                done();
            });
        });
        it("sets alert given non-OK response", (done) => {
            const getImagingSessionsStub = stub().rejects();
            sandbox.replace(labkeyClient, "getImagingSessions", getImagingSessionsStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            // before
            expect(getAlert(store.getState())).to.be.undefined;

            // apply
            store.dispatch(requestMetadata());

            // after
            // todo FMS-669 stop using subscribe to test multi-dispatch logics
            store.subscribe(() => {
                const alert = getAlert(store.getState());
                expect(alert).to.not.be.undefined;
                expect(get(alert, "type")).to.equal(AlertType.ERROR);
                expect(get(alert, "message")).to.contain("Failed to retrieve metadata.");
                done();
            });
        });
    });
    describe("requestAnnotations", () => {
        it("sets annotations given OK response", (done) => {
            const getAnnotationsStub = stub().resolves(mockAnnotations);
            const getAnnotationOptionsStub = stub().resolves(mockAnnotationOptions);
            sandbox.replace(labkeyClient, "getAnnotations", getAnnotationsStub);
            sandbox.replace(labkeyClient, "getAnnotationOptions", getAnnotationOptionsStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getAnnotations(state)).to.be.empty;
            expect(getAnnotationOptions(state)).to.be.empty;

            store.dispatch(requestAnnotations());

            // todo FMS-669 stop using subscribe to test multi-dispatch logics
            let count = 0;
            store.subscribe(() => {
                count++;
                if (count > 1) {
                    state = store.getState();
                    expect(getAnnotations(state)).to.not.be.empty;
                    expect(getAnnotationOptions(state)).to.not.be.empty;
                    done();
                }
            });
        });
        it("sets alert given not OK response", (done) => {
            const getAnnotationsStub = stub().rejects();
            sandbox.replace(labkeyClient, "getAnnotations", getAnnotationsStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(requestAnnotations());

            // todo FMS-669 stop using subscribe to test multi-dispatch logics
            let count = 0;
            store.subscribe(() => {
                count++;
                if (count > 1) {
                    state = store.getState();
                    expect(getAlert(state)).to.not.be.undefined;
                    done();
                }
            });
        });
    });
    describe("requestTemplates", () => {
        it("sets templates given OK response", (done) => {
            const getTemplatesStub = stub().resolves(mockAnnotations);
            sandbox.replace(labkeyClient, "getTemplates", getTemplatesStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getAnnotations(state)).to.be.empty;

            store.dispatch(requestTemplates());

            // todo FMS-669 stop using subscribe to test multi-dispatch logics
            let count = 0;
            store.subscribe(() => {
                count++;
                if (count > 1) {
                    state = store.getState();
                    expect(getTemplates(state)).to.not.be.empty;
                    done();
                }
            });
        });
        it("sets templates given not OK response", (done) => {
            const getTemplatesStub = stub().rejects();
            sandbox.replace(labkeyClient, "getTemplates", getTemplatesStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(requestTemplates());

            // todo FMS-669 stop using subscribe to test multi-dispatch logics
            let count = 0;
            store.subscribe(() => {
                count++;
                if (count > 1) {
                    state = store.getState();
                    expect(getAlert(state)).to.not.be.undefined;
                    done();
                }
            });
        });
    });
});
