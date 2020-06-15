import { expect } from "chai";
import { AnyAction } from "redux";
import { createSandbox, SinonStub, stub } from "sinon";

import { openTemplateEditor } from "../../selection/actions";
import {
  clearTemplateDraft,
  startTemplateDraft,
  startTemplateDraftFailed,
} from "../../template/actions";
import { DEFAULT_TEMPLATE_DRAFT } from "../../template/constants";
import { getTemplateDraft } from "../../template/selectors";
import {
  createMockReduxStore,
  labkeyClient,
  mmsClient,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockFavoriteColorAnnotation,
  mockMMSTemplate,
  mockState,
  mockTemplateStateBranch,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import { closeModal } from "../actions";
import { getTemplateEditorVisible } from "../selectors";

describe("Feedback logics", () => {
  describe("closeModalLogic", () => {
    const templateEditorOpenState: State = {
      ...mockState,
      feedback: {
        ...mockState.feedback,
        deferredAction: clearTemplateDraft(),
        visibleModals: ["templateEditor"],
      },
      template: getMockStateWithHistory({
        ...mockTemplateStateBranch,
        draft: {
          annotations: [],
          name: "My Template",
        },
      }),
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
    it("dispatches deferred action if present", async () => {
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
  describe("openTemplateEditorLogic", () => {
    const sandbox = createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    const stubMethods = (
      getTemplateOverride?: SinonStub,
      getTemplateHasBeenUsedOverride?: SinonStub
    ) => {
      sandbox.replace(
        mmsClient,
        "getTemplate",
        getTemplateOverride || stub().resolves(mockMMSTemplate)
      );
      sandbox.replace(
        labkeyClient,
        "getTemplateHasBeenUsed",
        getTemplateHasBeenUsedOverride || stub().resolves(true)
      );
    };

    const runTest = async (expectedAction: AnyAction) => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(openTemplateEditor(1));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(expectedAction)).to.be.true;
    };

    it("dispatches startTemplateDraft given OK requests", async () => {
      stubMethods();
      const expectedAction = startTemplateDraft(
        mockMMSTemplate,
        {
          ...mockMMSTemplate,
          annotations: [
            {
              ...mockFavoriteColorAnnotation,
              annotationTypeName: "Text",
              index: 0,
            },
          ],
        },
        true
      );
      await runTest(expectedAction);
    });

    it("dispatches startTemplateDraftFailed if getting template fails", async () => {
      stubMethods(stub().rejects(new Error("foo")));
      const expectedAction = startTemplateDraftFailed(
        "Could not retrieve template: foo"
      );
      await runTest(expectedAction);
    });

    it("dispatches startTemplateDraftFailed if getting template is used fails", async () => {
      stubMethods(undefined, stub().rejects(new Error("foo")));
      const expectedAction = startTemplateDraftFailed(
        "Could not retrieve template: foo"
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
