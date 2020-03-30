import { expect } from "chai";

import { openTemplateEditor } from "../../selection/actions";
import { clearTemplateDraft, getTemplate } from "../../template/actions";
import { DEFAULT_TEMPLATE_DRAFT } from "../../template/constants";
import { getTemplateDraft } from "../../template/selectors";
import { createMockReduxStore } from "../../test/configure-mock-store";

import {
    getMockStateWithHistory,
    mockState,
    mockTemplateStateBranch,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";

import { closeModal, setDeferredAction } from "../actions";
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
        it("dispatches setDeferredAction and getTemplate", async () => {
            const { actions, logicMiddleware, store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
            expect(actions.includesMatch(setDeferredAction(clearTemplateDraft()))).to.be.false;
            expect(actions.includesMatch(getTemplate(1))).to.be.false;

            store.dispatch(openTemplateEditor(1));
            await logicMiddleware.whenComplete();

            expect(actions.includesMatch(setDeferredAction(clearTemplateDraft()))).to.be.true;
            expect(actions.includesMatch(getTemplate(1))).to.be.true;
        });
    });
});
