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

import { gatherSettings, updateSettings } from "../actions";
import { getLimsHost, getMetadataColumns, getTemplateId } from "../selectors";

describe("Setting logics", () => {
    const localhost = "localhost";
    const stagingHost = "staging";
    const sandbox = createSandbox();

    let fmsHostSetterSpy: SinonSpy;
    let fmsPortSetterSpy: SinonSpy;
    let fmsUsernameSetterSpy: SinonSpy;
    let fmsMountPointSetterSpy: SinonSpy;
    let jssHostSetterSpy: SinonSpy;
    let jssPortSetterSpy: SinonSpy;
    let jssUsernameSetterSpy: SinonSpy;
    let labkeyClientHostSetterSpy: SinonSpy;
    let labkeyClientPortSetterSpy: SinonSpy;
    let mmsClientHostSetterSpy: SinonSpy;
    let mmsClientPortSetterSpy: SinonSpy;
    let mmsClientUsernameSetterSpy: SinonSpy;

    beforeEach(() => {
        fmsHostSetterSpy = spy();
        fmsPortSetterSpy = spy();
        fmsUsernameSetterSpy = spy();
        fmsMountPointSetterSpy = spy();
        jssHostSetterSpy = spy();
        jssPortSetterSpy = spy();
        jssUsernameSetterSpy = spy();
        labkeyClientHostSetterSpy = spy();
        labkeyClientPortSetterSpy = spy();
        mmsClientHostSetterSpy = spy();
        mmsClientPortSetterSpy = spy();
        mmsClientUsernameSetterSpy = spy();

        const { fms, jssClient, mmsClient } = mockReduxLogicDeps;
        stub(fms, "host").set(fmsHostSetterSpy);
        stub(fms, "port").set(fmsPortSetterSpy);
        stub(fms, "username").set(fmsUsernameSetterSpy);

        stub(jssClient, "host").set(jssHostSetterSpy);
        stub(jssClient, "port").set(jssPortSetterSpy);
        stub(jssClient, "username").set(jssUsernameSetterSpy);

        stub(labkeyClient, "host").set(labkeyClientHostSetterSpy);
        stub(labkeyClient, "port").set(labkeyClientPortSetterSpy);

        stub(mmsClient, "host").set(mmsClientHostSetterSpy);
        stub(mmsClient, "port").set(mmsClientPortSetterSpy);
        stub(mmsClient, "username").set(mmsClientUsernameSetterSpy);

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
        sandbox.replace(fms, "setMountPoint", fmsMountPointSetterSpy);

    });

    afterEach(() => {
        sandbox.restore();
    });

    describe("updateSettingsLogic", () => {

        it("updates settings if data persisted correctly", () => {
            const { store } = createMockReduxStore(mockState);

            // before
            expect(getLimsHost(store.getState())).to.equal(localhost);

            // apply
            store.dispatch(updateSettings({limsHost: stagingHost}));

            // after
            expect(getLimsHost(store.getState())).to.equal(stagingHost);
        });

        it("sets host and port on all LIMS clients", () => {
            const { store } = createMockReduxStore(mockState);

            // before
            expect(fmsHostSetterSpy.called).to.be.false;
            expect(fmsPortSetterSpy.called).to.be.false;
            expect(jssHostSetterSpy.called).to.be.false;
            expect(jssPortSetterSpy.called).to.be.false;
            expect(mmsClientHostSetterSpy.called).to.be.false;
            expect(mmsClientPortSetterSpy.called).to.be.false;

            // apply
            store.dispatch(updateSettings({limsHost: stagingHost, limsPort: "90"}));

            // after
            expect(fmsHostSetterSpy.called).to.be.true;
            expect(fmsPortSetterSpy.called).to.be.true;
            expect(jssHostSetterSpy.called).to.be.true;
            expect(jssPortSetterSpy.called).to.be.true;
            expect(mmsClientHostSetterSpy.called).to.be.true;
            expect(mmsClientPortSetterSpy.called).to.be.true;
        });

        it("sets username on all LIMS clients", () => {
            const { store } = createMockReduxStore(mockState);

            // before
            expect(fmsUsernameSetterSpy.called).to.be.false;
            expect(jssUsernameSetterSpy.called).to.be.false;
            expect(mmsClientUsernameSetterSpy.called).to.be.false;

            // apply
            store.dispatch(updateSettings({username: "bar"}));

            // after
            expect(fmsUsernameSetterSpy.called).to.be.true;
            expect(jssUsernameSetterSpy.called).to.be.true;
            expect(mmsClientUsernameSetterSpy.called).to.be.true;
        });

        it("sets mount point on FMS", () => {
            const { store } = createMockReduxStore(mockState);

            // before
            expect(fmsMountPointSetterSpy.called).to.be.false;

            // apply
            store.dispatch(updateSettings({mountPoint: "/test/aics"}));

            // after
            expect(fmsMountPointSetterSpy.called).to.be.true;
        });

        it("sets template id in settings", () => {
            const { store } = createMockReduxStore({
                ...mockState,
                setting: {
                    ...mockState.setting,
                },
            });

            expect(getTemplateId(store.getState())).to.be.undefined;

            store.dispatch(updateSettings({ templateId: 3 }));

            expect(getTemplateId(store.getState())).to.equal(3);
        });

        it("sets metadata columns in settings", () => {
            const { store } = createMockReduxStore({
                ...mockState,
                setting: {
                    ...mockState.setting,
                },
            });

            expect(getMetadataColumns(store.getState())).to.be.empty;

            store.dispatch(updateSettings({ metadataColumns: ["a", "b"] }));

            expect(getMetadataColumns(store.getState())).to.deep.equal(["a", "b"]);
        });

        it("Doesn't retrieve metadata and jobs if neither host or port changed", () => {
            const { store } = createMockReduxStore(mockState);
            store.dispatch(updateSettings({associateByWorkflow: true}));
            expect(fmsHostSetterSpy.called).to.be.false;
            expect(fmsPortSetterSpy.called).to.be.false;
            expect(jssHostSetterSpy.called).to.be.false;
            expect(jssPortSetterSpy.called).to.be.false;
        });

        it("updates settings in memory and sets warning alert if data persistence failure", () => {
            const deps = {
                ...mockReduxLogicDeps,
                storage: {
                    ...mockReduxLogicDeps.storage,
                    set: sinon.stub ().throwsException(),
                },
            };
            const { store } = createMockReduxStore(mockState, deps);

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
        it("updates settings to what is saved in storage and doesn't set alert", () => {
            const deps = {
                ...mockReduxLogicDeps,
                storage: {
                    ...mockReduxLogicDeps.storage,
                    get: sinon.stub().returns({
                        limsHost: stagingHost,
                    }),
                },
            };
            const { store } = createMockReduxStore(mockState, deps);

            // before
            expect(getLimsHost(store.getState())).to.equal(localhost);

            // apply
            store.dispatch(gatherSettings());

            // after
            expect(getLimsHost(store.getState())).to.equal(stagingHost);
            expect(getAlert(store.getState())).to.be.undefined;
        });

        it("sets alert if error in getting storage settings", () => {
            const deps = {
                ...mockReduxLogicDeps,
                storage: {
                    ...mockReduxLogicDeps.storage,
                    get: sinon.stub().throwsException(),
                },
            };
            const { store } = createMockReduxStore(mockState, deps);

            // apply
            store.dispatch(gatherSettings());

            // after
            expect(getLimsHost(store.getState())).to.equal(localhost);
            expect(getAlert(store.getState())).to.not.be.undefined;
        });
    });
});
