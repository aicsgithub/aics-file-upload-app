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
import { HTTP_STATUS, State } from "../../types";
import { closeModal, setAlert, setDeferredAction } from "../actions";
import { httpStatusToMessage } from "../reducer";
import { getAlert, getTemplateEditorVisible } from "../selectors";
import { AlertType } from "../types";

describe("Feedback logics", () => {

    describe("setAlertLogic", () => {
        it("Updates message if alert has a recognized statusCode", () => {
            const { store } = createMockReduxStore(mockState);

            store.dispatch(setAlert({
                statusCode: HTTP_STATUS.BAD_REQUEST,
                type: AlertType.WARN,
            }));

            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;

            if (alert) {
                expect(alert.message).to.equal(httpStatusToMessage.get(HTTP_STATUS.BAD_REQUEST));
            }
        });

        it("Does not update message if alert does not have a statusCode", () => {
            const { store } = createMockReduxStore(mockState);
            const message = "Hello";

            store.dispatch(setAlert({
                message,
                type: AlertType.INFO,
            }));

            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;

            if (alert) {
                expect(alert.message).to.equal(message);
            }
        });

        it("Does not update message if alert already has a message", () => {
            const { store } = createMockReduxStore(mockState);
            const message = "Hello world";

            store.dispatch(setAlert({
                message,
                statusCode: HTTP_STATUS.BAD_REQUEST,
                type: AlertType.INFO,
            }));

            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;

            if (alert) {
                expect(alert.message).to.equal(message);
            }
        });
    });

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
