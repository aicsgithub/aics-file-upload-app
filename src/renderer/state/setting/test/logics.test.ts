import { expect } from "chai";
import { SinonSpy, spy, stub } from "sinon";
import * as sinon from "sinon";

import { getAlert } from "../../feedback/selectors";
import {
    createMockReduxStore,
    mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";

import { gatherSettings, updateSettings } from "../actions";
import { getLimsHost } from "../selectors";

describe("Setting logics", () => {
    const localhost = "localhost";
    const stagingHost = "staging";

    describe("updateSettingsLogic", () => {
        let fmsHostSetterSpy: SinonSpy;
        let fmsPortSetterSpy: SinonSpy;
        let jssHostSetterSpy: SinonSpy;
        let jssPortSetterSpy: SinonSpy;

        beforeEach(() => {
            fmsHostSetterSpy = spy();
            fmsPortSetterSpy = spy();
            jssHostSetterSpy = spy();
            jssPortSetterSpy = spy();

            const { fms, jssClient } = mockReduxLogicDeps;
            stub(jssClient, "host").set(jssHostSetterSpy);
            stub(jssClient, "port").set(jssPortSetterSpy);
            stub(fms, "host").set(fmsHostSetterSpy);
            stub(fms, "port").set(fmsPortSetterSpy);
        });

        it("updates settings if data persisted correctly", () => {
            const store = createMockReduxStore(mockState);

            // before
            expect(getLimsHost(store.getState())).to.equal(localhost);

            // apply
            store.dispatch(updateSettings({limsHost: stagingHost}));

            // after
            expect(getLimsHost(store.getState())).to.equal(stagingHost);
        });

        it("sets host and port on FMS and JSS clients", () => {
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

        it("Retrieves metadata and jobs if host or port changed", () => {
            // const store = createMockReduxStore(mockState);
        });

        it("Doesn't retrieve metadata and jobs if neither host or port changed", () => {

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
});
