import { expect } from "chai";
import { Store } from "redux";
import { createSandbox, SinonSpy, spy, stub } from "sinon";
import * as sinon from "sinon";

import { getAlert } from "../../feedback/selectors";
import { retrieveJobs } from "../../job/actions";
import { requestMetadata } from "../../metadata/actions";
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

  let fmsMountPointSetterSpy: SinonSpy;

  beforeEach(() => {
    fmsMountPointSetterSpy = spy();

    const { fms } = mockReduxLogicDeps;

    const getAnnotationLookupsStub = stub().resolves(mockAnnotationLookups);
    const getAnnotationTypesStub = stub().resolves(mockAnnotationTypes);
    const getBarcodePrefixesStub = stub().resolves(mockBarcodePrefixes);
    const getChannelsStub = stub().resolves(mockChannels);
    const getImagingSessionsStub = stub().resolves(mockImagingSessions);
    const getLookupsStub = stub().resolves(mockLookups);
    const getUnitsStub = stub().resolves([mockUnit]);
    const getWorkflowsStub = stub().resolves(mockSelectedWorkflows);

    sandbox.replace(
      labkeyClient,
      "getAnnotationLookups",
      getAnnotationLookupsStub
    );
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

    it("sets mount point on FMS", () => {
      // before
      expect(fmsMountPointSetterSpy.called).to.be.false;

      // apply
      store.dispatch(updateSettings({ mountPoint: "/test/aics" }));

      // after
      expect(fmsMountPointSetterSpy.called).to.be.true;
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
      expect(actions.includesMatch(retrieveJobs())).to.be.false;
      store.dispatch(updateSettings(updateSettingsParam));
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(requestMetadata())).to.be.true;
      expect(actions.includesMatch(retrieveJobs())).to.be.true;
    };

    it("requests metadata and jobs again if host changes", async () => {
      await testActionsDispatched({ limsHost: "foo" });
    });

    it("requests metadata and jobs again if port changes", async () => {
      await testActionsDispatched({ limsPort: "500" });
    });

    it("requests metadata and jobs again if username changes", async () => {
      await testActionsDispatched({ username: "bar" });
    });

    it("Doesn't retrieve metadata and jobs if neither host or port changed", () => {
      const { actions } = createMockReduxStore(mockState, undefined, [
        updateSettingsLogic,
      ]);
      store.dispatch(updateSettings({ associateByWorkflow: true }));
      expect(actions.includesMatch(requestMetadata())).to.be.false;
    });

    it("updates settings in memory and sets warning alert if data persistence failure", () => {
      const deps = {
        ...mockReduxLogicDeps,
        storage: {
          ...mockReduxLogicDeps.storage,
          set: sinon.stub().throwsException(),
        },
      };
      const { store } = createMockReduxStore(mockState, deps, [
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
      const deps = {
        ...mockReduxLogicDeps,
        storage: {
          ...mockReduxLogicDeps.storage,
          get: sinon
            .stub()
            .onFirstCall()
            .returns({
              limsHost: stagingHost,
            })
            .onSecondCall()
            .returns(1),
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
      expect(getTemplateId(store.getState())).to.equal(1);
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
