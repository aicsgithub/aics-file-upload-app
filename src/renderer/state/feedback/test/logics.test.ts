import { expect } from "chai";
import { AnyAction } from "redux";
import { SinonStubbedInstance, createStubInstance, createSandbox } from "sinon";

import LabkeyClient from "../../../services/labkey-client";
import MMSClient from "../../../services/mms-client";
import { requestFailed } from "../../actions";
import { openTemplateEditor } from "../../selection/actions";
import { startEditingTemplate } from "../../template/actions";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockMMSTemplate,
  mockState,
  mockTemplateStateBranch,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { AsyncRequest, State } from "../../types";
import { closeModal } from "../actions";
import { getTemplateEditorVisible } from "../selectors";

describe("Feedback logics", () => {
  let mmsClient: SinonStubbedInstance<MMSClient>,
    labkeyClient: SinonStubbedInstance<LabkeyClient>;
  const sandbox = createSandbox();

  beforeEach(() => {
    mmsClient = createStubInstance(MMSClient);
    labkeyClient = createStubInstance(LabkeyClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("closeModalLogic", () => {
    const templateEditorOpenState: State = {
      ...mockState,
      feedback: {
        ...mockState.feedback,
        visibleModals: ["templateEditor"],
      },
      template: {
        ...mockTemplateStateBranch,
      },
    };
    it("sets templateEditor visibility to false when modal name is templateEditor", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...templateEditorOpenState,
      });
      // before
      expect(getTemplateEditorVisible(store.getState())).to.be.true;

      // apply
      store.dispatch(closeModal("templateEditor"));
      await logicMiddleware.whenComplete();

      // after
      expect(getTemplateEditorVisible(store.getState())).to.be.false;
    });
  });
  describe("openTemplateEditorLogic", () => {
    afterEach(() => {
      mmsClient.getTemplate.restore();
      labkeyClient.getTemplateHasBeenUsed.restore();
    });

    const runTest = async (expectedAction: AnyAction) => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(openTemplateEditor(1));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(expectedAction)).to.be.true;
    };

    it("dispatches startEditingTemplate given OK requests", async () => {
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      labkeyClient.getTemplateHasBeenUsed.resolves(true);
      const expectedAction = startEditingTemplate(mockMMSTemplate);
      await runTest(expectedAction);
    });

    it("dispatches requestFailed if getting template fails", async () => {
      mmsClient.getTemplate.rejects(new Error("foo"));
      labkeyClient.getTemplateHasBeenUsed.resolves(true);
      const expectedAction = requestFailed(
        "Could not retrieve template: foo",
        AsyncRequest.GET_TEMPLATE
      );
      await runTest(expectedAction);
    });

    it("dispatches getTemplate without a templateId", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );
      const action = openTemplateEditor();
      store.dispatch(action);
      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([action]);
    });
  });
});
