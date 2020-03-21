import { expect } from "chai";
import { clearTemplateDraft } from "../../template/actions";
import { DEFAULT_TEMPLATE_DRAFT } from "../../template/constants";
import { getTemplateDraft } from "../../template/selectors";
import { createMockReduxStore } from "../../test/configure-mock-store";

import { getMockStateWithHistory, mockState, mockTemplateStateBranch } from "../../test/mocks";
import { HTTP_STATUS } from "../../types";
import { closeModal, setAlert } from "../actions";
import { httpStatusToMessage } from "../logics";
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
        it("sets templateEditor visibility to false and resets template draft when modal name is templateEditor",
            () => {
                const { store } = createMockReduxStore({
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
                });
                // before
                expect(getTemplateEditorVisible(store.getState())).to.be.true;
                expect(getTemplateDraft(store.getState())).to.not.equal(DEFAULT_TEMPLATE_DRAFT);

                // apply
                store.dispatch(closeModal("templateEditor"));

                // after
                expect(getTemplateEditorVisible(store.getState())).to.be.false;
                expect(getTemplateDraft(store.getState())).to.deep.equal(DEFAULT_TEMPLATE_DRAFT);
            });
    });
});
