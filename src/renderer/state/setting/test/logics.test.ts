import { expect } from "chai";
import { Store } from "redux";
import { createSandbox, createStubInstance, SinonStubbedInstance } from "sinon";

import EnvironmentAwareStorage from "../../EnvironmentAwareStorage";
import { getAlert } from "../../feedback/selectors";
import { requestMetadata } from "../../metadata/actions";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { SettingStateBranch } from "../../types";
import { gatherSettings, updateSettings } from "../actions";
import settingsLogics, { updateSettingsLogic } from "../logics";
import {
  getLimsHost,
  getMetadataColumns,
  getShowTemplateHint,
  getShowUploadHint,
  getTemplateId,
} from "../selectors";

describe("Setting logics", () => {
  const localhost = "localhost";
  const stagingHost = "staging";
  const sandbox = createSandbox();
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;

  beforeEach(() => {
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = sandbox.stub();
    sandbox.replace(mockReduxLogicDeps, "storage", storage);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("updateSettingsLogic", () => {
    let store: Store;

    beforeEach(() => {
      ({ store } = createMockReduxStore(
        mockState,
        undefined,
        // Provide only the logic we are testing so we avoid running all the
        // logics that could be triggered by these tests.
        [updateSettingsLogic],
        undefined
      ));
    });

    it("updates settings if data persisted correctly", () => {
      // before
      expect(getLimsHost(store.getState())).to.equal(localhost);

      // apply
      store.dispatch(updateSettings({ limsHost: stagingHost }));

      // after
      expect(getLimsHost(store.getState())).to.equal(stagingHost);
    });

    it("sets template id in settings", () => {
      expect(getTemplateId(store.getState())).to.be.undefined;

      store.dispatch(updateSettings({ templateId: 3 }));

      expect(getTemplateId(store.getState())).to.equal(3);
    });

    it("sets metadata columns in settings", () => {
      expect(getMetadataColumns(store.getState())).to.be.empty;

      store.dispatch(updateSettings({ metadataColumns: ["a", "b"] }));

      expect(getMetadataColumns(store.getState())).to.deep.equal(["a", "b"]);
    });

    it("sets whether to show the upload hint in settings", () => {
      expect(getShowUploadHint(store.getState())).to.be.true;

      store.dispatch(updateSettings({ showUploadHint: false }));

      expect(getShowUploadHint(store.getState())).to.be.false;
    });

    it("sets whether to show the template hint in settings", () => {
      const { store } = createMockReduxStore({
        ...mockState,
        setting: {
          ...mockState.setting,
        },
      });

      expect(getShowTemplateHint(store.getState())).to.be.true;

      store.dispatch(updateSettings({ showTemplateHint: false }));

      expect(getShowTemplateHint(store.getState())).to.be.false;
    });

    const testActionsDispatched = async (
      updateSettingsParam: Partial<SettingStateBranch>
    ) => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        settingsLogics
      );
      expect(actions.includesMatch(requestMetadata())).to.be.false;
      store.dispatch(updateSettings(updateSettingsParam));
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(requestMetadata())).to.be.true;
    };

    it("requests metadata again if host changes", async () => {
      await testActionsDispatched({ limsHost: "foo" });
    });

    it("requests metadata again if port changes", async () => {
      await testActionsDispatched({ limsPort: "500" });
    });

    it("requests metadata again if username changes", async () => {
      await testActionsDispatched({ username: "bar" });
    });

    it("Doesn't retrieve metadata if neither host or port changed", () => {
      const { actions } = createMockReduxStore(mockState, undefined, [
        updateSettingsLogic,
      ]);
      store.dispatch(updateSettings({ associateByWorkflow: true }));
      expect(actions.includesMatch(requestMetadata())).to.be.false;
    });

    it("updates settings in memory and sets warning alert if data persistence failure", () => {
      storage.set.throwsException();
      const { store } = createMockReduxStore(mockState, undefined, [
        updateSettingsLogic,
      ]);

      // before
      expect(getLimsHost(store.getState())).to.equal(localhost);

      // apply
      store.dispatch(updateSettings({ limsHost: stagingHost }));

      // after
      expect(getLimsHost(store.getState())).to.equal(stagingHost);
      expect(getAlert(store.getState())).to.not.be.undefined;
    });
  });

  describe("gatherSettingsLogic", () => {
    it("doesn't do anything if no settings stored", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore();
      store.dispatch(gatherSettings());

      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(gatherSettings())).to.be.false;
    });
    it("updates settings to what is saved in storage and doesn't set alert", () => {
      storage.get
        .onFirstCall()
        .returns({
          limsHost: stagingHost,
        })
        .onSecondCall()
        .returns(1);
      const { store } = createMockReduxStore(mockState);

      // before
      expect(getLimsHost(store.getState())).to.equal(localhost);

      // apply
      store.dispatch(gatherSettings());

      // after
      expect(getLimsHost(store.getState())).to.equal(stagingHost);
      expect(getAlert(store.getState())).to.be.undefined;
      expect(getTemplateId(store.getState())).to.equal(1);
    });

    it("sets alert if error in getting storage settings", () => {
      storage.get.throwsException();
      const { store } = createMockReduxStore(mockState);

      // apply
      store.dispatch(gatherSettings());

      // after
      expect(getLimsHost(store.getState())).to.equal(localhost);
      expect(getAlert(store.getState())).to.not.be.undefined;
    });
  });
});
