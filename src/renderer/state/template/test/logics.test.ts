import { expect } from "chai";
import {
  createSandbox,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import { MMSClient } from "../../../services";
import { ColumnType } from "../../../services/labkey-client/types";
import { Template } from "../../../services/mms-client/types";
import { requestFailed } from "../../actions";
import { getAlert } from "../../feedback/selectors";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
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
import { AsyncRequest, State } from "../../types";
import {
  addExistingAnnotation,
  addExistingTemplate,
  removeAnnotations,
  saveTemplate,
  saveTemplateSucceeded,
} from "../actions";
import { getTemplateDraftAnnotations } from "../selectors";

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
    const stubMethods = (showMessageBoxOverride?: SinonStub) => {
      const showMessageBoxStub =
        showMessageBoxOverride || stub().resolves({ response: 1 });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      mmsClient.editTemplate.resolves(1);
      mmsClient.createTemplate.resolves(1);
      return { showMessageBoxStub };
    };

    it("shows a dialog if user should be warned about a versioning change and continues saving if user clicks Continue", async () => {
      const { showMessageBoxStub } = stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(showMessageBoxStub.called).to.be.false;
      expect(mmsClient.editTemplate.called).to.be.false;

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(showMessageBoxStub.called).to.be.true;
      expect(mmsClient.editTemplate.called).to.be.true;
    });

    it("allows users to cancel saving template if they click cancel in the warning dialog", async () => {
      const { showMessageBoxStub } = stubMethods(
        stub().resolves({ response: 0 })
      );
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(showMessageBoxStub.called).to.be.false;
      expect(mmsClient.editTemplate.called).to.be.false;

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(showMessageBoxStub.called).to.be.true;
      expect(mmsClient.editTemplate.called).to.be.false;
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
      stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(mmsClient.editTemplate.called).to.be.false;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(mmsClient.editTemplate.called).to.be.true;
    });
    it("calls createTemplate endpoint if draft does not have template id", async () => {
      stubMethods();
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

      expect(mmsClient.createTemplate.called).to.be.false;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(mmsClient.createTemplate.called).to.be.true;
    });
    it("dispatches requestFailed if saving template fails", async () => {
      const error = "Bad credentials";
      mmsClient.editTemplate.rejects({
        response: {
          data: {
            error,
          },
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore({
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

      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not save template: Bad credentials",
            AsyncRequest.SAVE_TEMPLATE
          )
        )
      ).to.be.true;
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

      store.dispatch(saveTemplate());
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

      store.dispatch(saveTemplate());
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

      store.dispatch(saveTemplate());
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

  describe("addExistingTemplateLogic", () => {
    it("adds annotations from selected template", async () => {
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      const { logicMiddleware, store } = createMockReduxStore(startState);

      let state = store.getState();
      expect(getTemplateDraftAnnotations(state).length).to.equal(0);

      store.dispatch(addExistingTemplate(1));
      await logicMiddleware.whenComplete();

      state = store.getState();
      expect(getTemplateDraftAnnotations(state).length).to.equal(1);
    });
  });
});
