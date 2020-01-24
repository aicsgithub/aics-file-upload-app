import { expect } from "chai";

import { getSelectionHistory, getTemplateHistory, getUploadHistory } from "../../metadata/selectors";
import { selectWorkflowPath } from "../../selection/actions";
import { getCurrentSelectionIndex } from "../../selection/selectors";
import { createMockReduxStore } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";

import { selectPage } from "../actions";
import { getPage } from "../selectors";
import { Page } from "../types";

describe("Route logics", () => {
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
});
