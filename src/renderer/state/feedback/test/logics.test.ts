import { expect } from "chai";
import { SinonStubbedInstance, createStubInstance, createSandbox } from "sinon";

import LabkeyClient from "../../../services/labkey-client";
import MMSClient from "../../../services/mms-client";
import { DEFAULT_TEMPLATE_DRAFT } from "../../template/constants";
import { getTemplateDraft } from "../../template/selectors";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockState, mockTemplateStateBranch } from "../../test/mocks";
import { State } from "../../types";
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
        draft: {
          annotations: [],
          name: "My Template",
        },
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
    it("clears template draft state when templateEditor modal is closed", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...templateEditorOpenState,
      });
      // before
      expect(getTemplateDraft(store.getState())).to.not.equal(
        DEFAULT_TEMPLATE_DRAFT
      );

      // apply
      store.dispatch(closeModal("templateEditor"));
      await logicMiddleware.whenComplete();

      // after
      expect(getTemplateDraft(store.getState())).to.deep.equal(
        DEFAULT_TEMPLATE_DRAFT
      );
    });
  });
});
