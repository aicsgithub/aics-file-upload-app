import { expect } from "chai";
import { get } from "lodash";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { createMockReduxStore, labkeyClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    mockBarcodePrefixes, mockChannels,
    mockDatabaseMetadata,
    mockImagingSessions,
    mockSelectedWorkflows,
    mockState,
    mockUnit,
} from "../../test/mocks";
import { requestMetadata } from "../actions";

import {
    getBarcodePrefixes, getChannels,
    getDatabaseMetadata,
    getImagingSessions,
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
            const getBarcodePrefixesStub = stub().resolves(mockBarcodePrefixes);
            const getChannelsStub = stub().resolves(mockChannels);
            const getDatabaseMetadataStub = stub().resolves(mockDatabaseMetadata);
            const getImagingSessionsStub = stub().resolves(mockImagingSessions);
            const getUnitsStub = stub().resolves([mockUnit]);
            const getWorkflowsStub = stub().resolves(mockSelectedWorkflows);

            sandbox.replace(labkeyClient, "getBarcodePrefixes", getBarcodePrefixesStub);
            sandbox.replace(labkeyClient, "getChannels", getChannelsStub);
            sandbox.replace(labkeyClient, "getDatabaseMetadata", getDatabaseMetadataStub);
            sandbox.replace(labkeyClient, "getImagingSessions", getImagingSessionsStub);
            sandbox.replace(labkeyClient, "getUnits", getUnitsStub);
            sandbox.replace(labkeyClient, "getWorkflows", getWorkflowsStub);

            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            let state = store.getState();
            expect(getBarcodePrefixes(state)).to.be.empty;
            expect(getChannels(state)).to.be.empty;
            expect(getDatabaseMetadata(state)).to.be.undefined;
            expect(getImagingSessions(state)).to.be.empty;
            expect(getUnits(state)).to.be.empty;
            expect(getWorkflowOptions(state)).to.be.empty;

            store.dispatch(requestMetadata());

            store.subscribe(() => {
                state = store.getState();
                expect(getBarcodePrefixes(state)).to.not.be.empty;
                expect(getChannels(state)).to.not.be.empty;
                expect(getDatabaseMetadata(state)).to.not.be.undefined;
                expect(getImagingSessions(state)).to.not.be.empty;
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
            store.subscribe(() => {
                const alert = getAlert(store.getState());
                expect(alert).to.not.be.undefined;
                expect(get(alert, "type")).to.equal(AlertType.ERROR);
                expect(get(alert, "message")).to.equal("Failed to retrieve metadata.");
                done();
            });
        });
    });
});
