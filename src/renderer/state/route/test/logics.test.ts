import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import { getSelectionHistory, getTemplateHistory, getUploadHistory } from "../../metadata/selectors";
import { selectWorkflowPath } from "../../selection/actions";
import { getCurrentSelectionIndex } from "../../selection/selectors";
import { createMockReduxStore, dialog } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";

import { goBack, selectPage } from "../actions";
import { getPage, getView } from "../selectors";
import { Page } from "../types";

describe("Route logics", () => {
    const sandbox = createSandbox();
    afterEach(() => {
        sandbox.restore();
    });

    describe("selectPageLogic", () => {
        // This is going forward
        it("Going from DragAndDrop to SelectUploadType should record the index selection/template/upload state " +
            "branches were at after leaving that page", async () => {
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                route: {
                    page: Page.DragAndDrop,
                    view: Page.DragAndDrop,
                },
            });

            // before
            let state = store.getState();
            expect(getSelectionHistory(state)).to.be.empty;
            expect(getTemplateHistory(state)).to.be.empty;
            expect(getUploadHistory(state)).to.be.empty;
            expect(getPage(state)).to.equal(Page.DragAndDrop);

            // apply
            store.dispatch(selectPage(Page.DragAndDrop, Page.SelectUploadType));

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getSelectionHistory(state)[Page.DragAndDrop]).to.equal(0);
            expect(getTemplateHistory(state)[Page.DragAndDrop]).to.equal(0);
            expect(getUploadHistory(state)[Page.DragAndDrop]).to.equal(0);
            expect(getPage(state)).to.equal(Page.SelectUploadType);
        });
        it("Going from SelectUploadType to AssociateFiles should record which index selection/template/upload state " +
            "branches are at for the page we went to", async () => {
            const startingSelectionHistory = {
                [Page.SelectUploadType]: 0,
            };
            const startingTemplateHistory = {
                [Page.SelectUploadType]: 0,
            };
            const startingUploadHistory = {
                [Page.SelectUploadType]: 0,
            };
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    history: {
                        selection: startingSelectionHistory,
                        template: startingTemplateHistory,
                        upload: startingUploadHistory,
                    },
                },
                route: {
                    page: Page.SelectUploadType,
                    view: Page.SelectUploadType,
                },
            });
            let state = store.getState();
            expect(getSelectionHistory(state)).to.equal(startingSelectionHistory);
            expect(getTemplateHistory(state)).to.equal(startingTemplateHistory);
            expect(getUploadHistory(state)).to.equal(startingUploadHistory);

            store.dispatch(selectWorkflowPath());
            await logicMiddleware.whenComplete();

            // before
            expect(getCurrentSelectionIndex(store.getState())).to.be.equal(2);

            // apply
            store.dispatch(selectPage(Page.SelectUploadType, Page.AssociateFiles));

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getSelectionHistory(state)).to.deep.equal({
                ...startingSelectionHistory,
                [Page.SelectUploadType]: 2,
            });
            expect(getTemplateHistory(state)).to.deep.equal({
                ...startingTemplateHistory,
                [Page.SelectUploadType]: 0,
            });
            expect(getUploadHistory(state)).to.deep.equal({
                ...startingUploadHistory,
                [Page.SelectUploadType]: 0,
            });
            expect(getPage(state)).to.equal(Page.AssociateFiles);
        });
        it("Going from SelectUploadType to DragAndDrop should change indexes for selection/template/upload to 0" +
            "back to where they were when the user left the DragAndDrop page", async () => {
            const startingSelectionHistory = {
                [Page.DragAndDrop]: 0,
            };
            const startingTemplateHistory = {
                [Page.DragAndDrop]: 0,

            };
            const startingUploadHistory = {
                [Page.DragAndDrop]: 0,
            };
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    history: {
                        selection: startingSelectionHistory,
                        template: startingTemplateHistory,
                        upload: startingUploadHistory,
                    },
                },
                route: {
                    page: Page.SelectUploadType,
                    view: Page.SelectUploadType,
                },
            });
            store.dispatch(selectWorkflowPath());
            await logicMiddleware.whenComplete();

            // before
            expect(getCurrentSelectionIndex(store.getState())).to.be.equal(2);

            // apply
            store.dispatch(selectPage(Page.SelectUploadType, Page.DragAndDrop));

            // after
            await logicMiddleware.whenComplete();
            const state = store.getState();
            expect(getCurrentSelectionIndex(state)).to.equal(0);
            expect(getPage(state)).to.equal(Page.DragAndDrop);
        });
    });
    describe("goBackLogic", () => {
        /**
         * helper function for go back logic tests
         * @param startPage the page we start on
         * @param expectedEndPage the page we expect to end at
         * @param respondOKToDialog whether or not the user says OK to the dialog asking them if it's okay to lose their
         * changes and go back
         */
        const runGoBackTest = async (startPage: Page, expectedEndPage: Page, respondOKToDialog: boolean = true) => {
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                route: {
                    page: startPage,
                    view: startPage,
                },
            });

            const dialogResult = respondOKToDialog ? 1 : 0;
            const showMessageBoxStub = stub().callsArgWith(1, dialogResult);
            sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);

            expect(getPage(store.getState())).to.equal(startPage);
            expect(getView(store.getState())).to.equal(startPage);

            store.dispatch(goBack());

            await logicMiddleware.whenComplete();
            expect(getPage(store.getState())).to.equal(expectedEndPage);
            expect(getView(store.getState())).to.equal(expectedEndPage);
        };
        it("goes to SelectStorageIntent page if going back from AddCustomData page", async () => {
            await runGoBackTest(Page.AddCustomData, Page.SelectStorageLocation);
        });
        it("goes to AssociateFiles page if going back from SelectStorageLocation page", async () => {
            await runGoBackTest(Page.SelectStorageLocation, Page.AssociateFiles);
        });
        it("goes to SelectUploadType page if going back from AssociateFiles page", async () => {
            await runGoBackTest(Page.AssociateFiles, Page.SelectUploadType);
        });
        it("goes to DragAndDrop page if going back from SelectUploadType page", async () => {
            await runGoBackTest(Page.SelectUploadType, Page.DragAndDrop);
        });
        it("goes to UploadSummary page if going back from DragAndDrop page", async () => {
            await runGoBackTest(Page.DragAndDrop, Page.UploadSummary);
        });
        it("does not change pages if user cancels the action through the dialog", async () => {
            await runGoBackTest(Page.SelectUploadType, Page.SelectUploadType, false);
        });
    });
});
