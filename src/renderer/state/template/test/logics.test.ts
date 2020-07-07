import { expect } from "chai";
import { createSandbox, SinonStub, stub } from "sinon";

import { ColumnType } from "../../../services/labkey-client/types";
import { Template } from "../../../services/mms-client/types";
import { getAlert } from "../../feedback/selectors";
import {
  createMockReduxStore,
  dialog,
  mmsClient,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationDraft,
  mockAnnotationTypes,
  mockAuditInfo,
  mockFavoriteColorAnnotation,
  mockLookups,
  mockMMSTemplate,
  mockState,
  mockTemplateDraft,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import {
  addExistingAnnotation,
  removeAnnotations,
  saveTemplate,
} from "../actions";
import { getTemplateDraftAnnotations } from "../selectors";

describe("Template Logics", () => {
  const sandbox = createSandbox();

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

  describe("addExistingAnnotationLogic", () => {
    it("adds annotation to draft annotations", () => {
      const { store } = createMockReduxStore({ ...startState });

      let state = store.getState();
      expect(getTemplateDraftAnnotations(state).length).to.equal(0);

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 3,
        })
      );

      state = store.getState();
      expect(getTemplateDraftAnnotations(state).length).to.equal(1);
    });
    it("sets alert if the annotation type is not recognized", () => {
      const { store } = createMockReduxStore({ ...startState });

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 100,
        })
      );

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
    it("sets alert if the annotation type is lookup and no annotationlookup junction exists", () => {
      const { store } = createMockReduxStore({
        ...startState,
        metadata: {
          ...startState.metadata,
          annotationLookups: [],
        },
      });

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 6,
        })
      );

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
    it("sets alert if lookup id is invalid", () => {
      const { store } = createMockReduxStore({
        ...startState,
        metadata: {
          ...startState.metadata,
          lookups: [],
        },
      });

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 6,
        })
      );

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
  });

  describe("removeAnnotationsLogic", () => {
    it("removes annotations from template draft", () => {
      const { store } = createMockReduxStore({
        ...startState,
        template: getMockStateWithHistory({
          ...startState.template.present,
          draft: {
            annotations: [
              {
                annotationId: 1,
                annotationTypeId: 1,
                annotationTypeName: ColumnType.TEXT,
                index: 0,
                required: false,
              },
              {
                annotationId: 2,
                annotationTypeId: 1,
                annotationTypeName: ColumnType.TEXT,
                index: 1,
                required: false,
              },
              {
                annotationId: 3,
                annotationTypeId: 1,
                annotationTypeName: ColumnType.TEXT,
                index: 2,
                required: false,
              },
            ],
            name: "My template",
          },
        }),
      });

      store.dispatch(removeAnnotations([0, 2]));
      expect(getTemplateDraftAnnotations(store.getState()).length).to.equal(1);
    });
  });

  describe("saveTemplateLogic", () => {
    let originalTemplate: Template;
    let stateWithChangedTemplateDraft: State;
    beforeEach(() => {
      originalTemplate = {
        ...mockMMSTemplate,
        annotations: [
          {
            ...mockAuditInfo,
            annotationId: 1,
            annotationTypeId: 1,
            description: "You know what a color is",
            name: "Color",
            required: false,
          },
        ],
      };
      stateWithChangedTemplateDraft = {
        ...startState,
        template: getMockStateWithHistory({
          ...startState.template.present,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
            templateId: 1,
          },
          original: originalTemplate,
          originalTemplateHasBeenUsed: true,
        }),
      };
    });
    const stubMethods = (
      showMessageBoxOverride?: SinonStub,
      editTemplateOverride?: SinonStub,
      createTemplateOverride?: SinonStub
    ) => {
      const showMessageBoxStub =
        showMessageBoxOverride || stub().resolves({ response: 1 });
      const editTemplateStub = editTemplateOverride || stub().resolves([1]);
      const createTemplateStub = createTemplateOverride || stub().resolves([1]);
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      sandbox.replace(mmsClient, "editTemplate", editTemplateStub);
      sandbox.replace(mmsClient, "createTemplate", createTemplateStub);
      return { showMessageBoxStub, editTemplateStub, createTemplateStub };
    };

    it("shows a dialog if user should be warned about a versioning change and continues saving if user clicks Continue", async () => {
      const { editTemplateStub, showMessageBoxStub } = stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(showMessageBoxStub.called).to.be.false;
      expect(editTemplateStub.called).to.be.false;

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(showMessageBoxStub.called).to.be.true;
      expect(editTemplateStub.called).to.be.true;
    });

    it("allows users to cancel saving template if they click cancel in the warning dialog", async () => {
      const { editTemplateStub, showMessageBoxStub } = stubMethods(
        stub().resolves({ response: 0 })
      );
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(showMessageBoxStub.called).to.be.false;
      expect(editTemplateStub.called).to.be.false;

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(showMessageBoxStub.called).to.be.true;
      expect(editTemplateStub.called).to.be.false;
    });

    it("doesn't show warning dialog if user is creating a template", async () => {
      const { showMessageBoxStub } = stubMethods();

      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      expect(showMessageBoxStub.called).to.be.false;

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(showMessageBoxStub.called).to.be.false;
    });
    it("doesn't show warning dialog if changes won't cause versioning", async () => {
      const { showMessageBoxStub } = stubMethods();

      const { logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...nonEmptyStateForInitiatingUpload.template.present,
          draft: mockTemplateDraft,
          original: mockMMSTemplate,
          originalTemplateHasBeenUsed: false,
        }),
      });

      expect(showMessageBoxStub.called).to.be.false;

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(showMessageBoxStub.called).to.be.false;
    });
    it("calls editTemplate endpoint if draft has template id", async () => {
      const { editTemplateStub } = stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(editTemplateStub.called).to.be.false;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(editTemplateStub.called).to.be.true;
    });
    it("calls createTemplate endpoint if draft does not have template id", async () => {
      const { createTemplateStub } = stubMethods();
      const { logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: getMockStateWithHistory({
          ...startState.template.present,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
          },
        }),
      });

      expect(createTemplateStub.called).to.be.false;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(createTemplateStub.called).to.be.true;
    });
    it("sets alert if endpoint returns not OK response", async () => {
      const error = "Bad credentials";
      const editTemplateStub = stub().rejects({
        response: {
          data: {
            error,
          },
        },
      });
      sandbox.replace(mmsClient, "editTemplate", editTemplateStub);
      const { logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: getMockStateWithHistory({
          ...startState.template.present,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
            templateId: 1,
          },
        }),
      });

      expect(getAlert(store.getState())).to.be.undefined;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      if (alert) {
        expect(alert.message).to.equal(`Could not save template: ${error}`);
      }
    });
  });
});
