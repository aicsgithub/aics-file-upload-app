import { expect } from "chai";
import { createSandbox, SinonSpy, spy, stub } from "sinon";
import * as sinon from "sinon";

import { getAlert } from "../../feedback/selectors";
import {
    createMockReduxStore,
    labkeyClient,
    mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
    mockAnnotationLookups,
    mockAnnotationTypes,
    mockBarcodePrefixes,
    mockChannels,
    mockImagingSessions,
    mockLookups,
    mockSelectedWorkflows,
    mockState,
    mockUnit,
} from "../../test/mocks";

import { addTemplateIdToSettings, gatherSettings, updateSettings } from "../actions";
import { getLimsHost, getTemplateIds } from "../selectors";

describe("Setting logics", () => {
    const localhost = "localhost";
    const stagingHost = "staging";
    const sandbox = createSandbox();

    let fmsHostSetterSpy: SinonSpy;
    let fmsPortSetterSpy: SinonSpy;
    let jssHostSetterSpy: SinonSpy;
    let jssPortSetterSpy: SinonSpy;
    let labkeyClientHostSetterSpy: SinonSpy;
    let labkeyClientPortSetterSpy: SinonSpy;
    let mmsClientHostSetterSpy: SinonSpy;
    let mmsClientPortSetterSpy: SinonSpy;

    beforeEach(() => {
        fmsHostSetterSpy = spy();
        fmsPortSetterSpy = spy();
        jssHostSetterSpy = spy();
        jssPortSetterSpy = spy();
        labkeyClientHostSetterSpy = spy();
        labkeyClientPortSetterSpy = spy();
        mmsClientHostSetterSpy = spy();
        mmsClientPortSetterSpy = spy();

        const { fms, jssClient, mmsClient } = mockReduxLogicDeps;
        stub(fms, "host").set(fmsHostSetterSpy);
        stub(fms, "port").set(fmsPortSetterSpy);

        stub(jssClient, "host").set(jssHostSetterSpy);
        stub(jssClient, "port").set(jssPortSetterSpy);

        stub(labkeyClient, "host").set(labkeyClientHostSetterSpy);
        stub(labkeyClient, "port").set(labkeyClientPortSetterSpy);

        stub(mmsClient, "host").set(mmsClientHostSetterSpy);
        stub(mmsClient, "port").set(mmsClientPortSetterSpy);

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

    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("updateSettingsLogic", () => {

        it("updates settings if data persisted correctly", () => {
            const store = createMockReduxStore(mockState);

            // before
            expect(getLimsHost(store.getState())).to.equal(localhost);

            // apply
            store.dispatch(updateSettings({limsHost: stagingHost}));

            // after
            expect(getLimsHost(store.getState())).to.equal(stagingHost);
        });

        it("sets host and port on all LIMS clients", () => {
            const store = createMockReduxStore(mockState);

            // before
            expect(fmsHostSetterSpy.called).to.be.false;
            expect(fmsPortSetterSpy.called).to.be.false;
            expect(jssHostSetterSpy.called).to.be.false;
            expect(jssPortSetterSpy.called).to.be.false;

            // apply
            store.dispatch(updateSettings({limsHost: stagingHost, limsPort: "90"}));

            // after
            expect(fmsHostSetterSpy.called).to.be.true;
            expect(fmsPortSetterSpy.called).to.be.true;
            expect(jssHostSetterSpy.called).to.be.true;
            expect(jssPortSetterSpy.called).to.be.true;
        });

        it("Doesn't retrieve metadata and jobs if neither host or port changed", () => {
            const store = createMockReduxStore(mockState);
            store.dispatch(updateSettings({associateByWorkflow: true}));
            expect(fmsHostSetterSpy.called).to.be.false;
            expect(fmsPortSetterSpy.called).to.be.false;
            expect(jssHostSetterSpy.called).to.be.false;
            expect(jssPortSetterSpy.called).to.be.false;
        });

        it("updates settings in memory and sets warning alert if data persistance failure", () => {
            const deps = {
                ...mockReduxLogicDeps,
                storage: {
                    ...mockReduxLogicDeps.storage,
                    set: sinon.stub ().throwsException(),
                },
            };
            const store = createMockReduxStore(mockState, deps);

            // before
            expect(getLimsHost(store.getState())).to.equal(localhost);

            // apply
            store.dispatch(updateSettings({limsHost: stagingHost}));

            // after
            expect(getLimsHost(store.getState())).to.equal(stagingHost);
            expect(getAlert(store.getState())).to.not.be.undefined;
        });
    });

    describe("gatherSettingsLogic",  () => {
        it("updates settings to what is saved in storage", () => {
            const deps = {
                ...mockReduxLogicDeps,
                storage: {
                    ...mockReduxLogicDeps.storage,
                    get: sinon.stub().returns({
                        limsHost: stagingHost,
                    }),
                },
            };
            const store = createMockReduxStore(mockState, deps);

            // before
            expect(getLimsHost(store.getState())).to.equal(localhost);

            // apply
            store.dispatch(gatherSettings());

            // after
            expect(getLimsHost(store.getState())).to.equal(stagingHost);
        });

        it("sets alert if error in getting storage settings", () => {
            const deps = {
                ...mockReduxLogicDeps,
                storage: {
                    ...mockReduxLogicDeps.storage,
                    get: sinon.stub().throwsException(),
                },
            };
            const store = createMockReduxStore(mockState, deps);

            // apply
            store.dispatch(gatherSettings());

            // after
            expect(getLimsHost(store.getState())).to.equal(localhost);
            expect(getAlert(store.getState())).to.not.be.undefined;
        });
    });

    describe("addTemplateIdToSettingsLogic", () => {
        it("adds template id to settings", () => {
            const store = createMockReduxStore({
                ...mockState,
                setting: {
                    ...mockState.setting,
                    templateIds: [1],
                },
            });

            expect(getTemplateIds(store.getState()).length).to.equal(1);

            store.dispatch(addTemplateIdToSettings(2));

            expect(getTemplateIds(store.getState()).length).to.equal(2);
            expect(getTemplateIds(store.getState())).contains(2);
        });
    });
});
