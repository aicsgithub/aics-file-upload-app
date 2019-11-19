import { expect } from "chai";
import { createMockReduxStore } from "../../test/configure-mock-store";

import { mockState } from "../../test/mocks";
import { HTTP_STATUS } from "../../types";
import { setAlert } from "../actions";
import { httpStatusToMessage } from "../logics";
import { getAlert } from "../selectors";
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
});
