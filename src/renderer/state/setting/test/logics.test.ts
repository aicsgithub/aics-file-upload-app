import { expect } from "chai";
import * as sinon from "sinon";

import { getAlert } from "../../feedback/selectors";
import { createMockReduxStore, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";

import { gatherSettings, updateSettings } from "../actions";
import { getLimsHost } from "../selectors";

describe("Setting logics", () => {
    const localhost = "localhost";
    const stagingHost = "staging";

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

       it("updates settings in memory and sets warning alert if data persistance failure", () => {
           const deps = {
               ...mockReduxLogicDeps,
               storage: {
                   ...mockReduxLogicDeps.storage,
                   set: sinon.stub().throwsException(),
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
