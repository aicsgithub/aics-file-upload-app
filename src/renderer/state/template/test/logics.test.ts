import { expect } from "chai";
import {
  createSandbox,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import { MMSClient } from "../../../services";
import { requestFailed } from "../../actions";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockAnnotationTypes,
  mockFavoriteColorAnnotation,
  mockLookups,
  mockState,
} from "../../test/mocks";
import { AsyncRequest, State } from "../../types";
import { saveTemplate, saveTemplateSucceeded } from "../actions";

describe("Template Logics", () => {
  const sandbox = createSandbox();
  let mmsClient: SinonStubbedInstance<MMSClient>;

  beforeEach(() => {
    mmsClient = createStubInstance(MMSClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  const startState = {
    ...mockState,
    metadata: {
      ...mockState.metadata,
      annotationLookups: [
        { annotationId: mockFavoriteColorAnnotation.annotationId, lookupId: 1 },
      ],
      annotationTypes: mockAnnotationTypes,
      lookups: mockLookups,
    },
  };

  describe("saveTemplateLogic", () => {
    let stateWithChangedTemplateDraft: State;
    beforeEach(() => {
      stateWithChangedTemplateDraft = {
        ...startState,
        template: {
          ...startState.template,
        },
      };
    });
    const stubMethods = (showMessageBoxOverride?: SinonStub) => {
      const showMessageBoxStub =
        showMessageBoxOverride || stub().resolves({ response: 1 });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      mmsClient.editTemplate.resolves(1);
      mmsClient.createTemplate.resolves(1);
      return { showMessageBoxStub };
    };

    it("calls editTemplate endpoint if draft has template id", async () => {
      stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(mmsClient.editTemplate.called).to.be.false;
      store.dispatch(saveTemplate("myTemplate", []));

      await logicMiddleware.whenComplete();
      expect(mmsClient.editTemplate.called).to.be.true;
    });

    it("dispatches saveTemplateSucceeded if template was saved successfully", async () => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        stub().resolves({ response: 1 })
      );
      mmsClient.editTemplate.resolves(1);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      store.dispatch(saveTemplate("myTemplate", []));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(saveTemplateSucceeded(1))).to.be.true;
    });

    it("dispatches requestFailed if booleanAnnotationTypeId is not defined", async () => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        stub().resolves({ response: 1 })
      );
      mmsClient.editTemplate.resolves(1);
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...stateWithChangedTemplateDraft,
        metadata: {
          ...stateWithChangedTemplateDraft.metadata,
          annotationTypes: [],
        },
      });

      store.dispatch(saveTemplate("myTemplate", []));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            "Could not get boolean annotation type id. Contact Software",
            AsyncRequest.SAVE_TEMPLATE
          )
        )
      );
    });

    it("dispatches requestFailed if getTemplate fails", async () => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        stub().resolves({ response: 1 })
      );
      mmsClient.editTemplate.resolves(1);
      mmsClient.getTemplate.rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      store.dispatch(saveTemplate("myTemplate", []));
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not retrieve template and update uploads: foo",
            AsyncRequest.GET_TEMPLATE
          )
        )
      );
    });
  });
});
