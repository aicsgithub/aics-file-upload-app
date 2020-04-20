import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import { openTemplateEditor } from "../../selection/actions";
import { clearTemplateDraft, updateTemplateDraft } from "../../template/actions";
import { DEFAULT_TEMPLATE_DRAFT } from "../../template/constants";
import { getTemplateDraft } from "../../template/selectors";
import { createMockReduxStore, mmsClient } from "../../test/configure-mock-store";

import {
    getMockStateWithHistory, mockFavoriteColorAnnotation, mockMMSTemplate,
    mockState,
    mockTemplateStateBranch,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";

import { closeModal, removeRequestFromInProgress } from "../actions";
import { getTemplateEditorVisible } from "../selectors";
import { AsyncRequest } from "../types";

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
        it("sets templateEditor visibility to false when modal name is templateEditor",
            async () => {
                const { logicMiddleware, store } = createMockReduxStore({ ...templateEditorOpenState });
                // before
                expect(getTemplateEditorVisible(store.getState())).to.be.true;

                // apply
                store.dispatch(closeModal("templateEditor"));
                await logicMiddleware.whenComplete();

                // after
                expect(getTemplateEditorVisible(store.getState())).to.be.false;
            });
        it("dispatches deferred action if present", async () => {
            const { logicMiddleware, store } = createMockReduxStore({ ...templateEditorOpenState });
            // before
            expect(getTemplateDraft(store.getState())).to.not.equal(DEFAULT_TEMPLATE_DRAFT);

            // apply
            store.dispatch(closeModal("templateEditor"));
            await logicMiddleware.whenComplete();

            // after
            expect(getTemplateDraft(store.getState())).to.deep.equal(DEFAULT_TEMPLATE_DRAFT);
        });
    });
    describe("openTemplateEditorLogic", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("dispatches setDeferredAction and getTemplate", async () => {
            const expectedUpdateTemplateDraftAction = updateTemplateDraft({
                ...mockMMSTemplate,
                annotations: [{
                    ...mockFavoriteColorAnnotation,
                    annotationTypeName: "Text",
                    index: 0,
                }],
            });
            sandbox.replace(mmsClient, "getTemplate", stub().resolves(mockMMSTemplate));
            const { actions, logicMiddleware, store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
            expect(actions.includesMatch(removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE))).to.be.false;
            expect(actions.includesMatch(expectedUpdateTemplateDraftAction)).to.be.false;

            store.dispatch(openTemplateEditor(1));
            await logicMiddleware.whenComplete();

            expect(actions.includesMatch(removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE))).to.be.true;
            expect(actions.includesMatch(expectedUpdateTemplateDraftAction)).to.be.true;
        });
    });
});
