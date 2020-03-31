import { expect } from "chai";
import { selectPage } from "../actions";

import reducer from "../reducer";

import { mockSelection, nonEmptyStateForInitiatingUpload } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";

import { Page, RouteStateBranch } from "../types";

describe("route reducer", () => {
    let route: RouteStateBranch;
    beforeEach(() => {
        route = {
            ...mockSelection,
            page: Page.UploadSummary,
            view: Page.UploadSummary,
        };
    });
    describe("selectPage", () => {
        it("sets page and view to payload.nextPage", () => {
            const result = reducer(route, selectPage(Page.UploadSummary, Page.DragAndDrop));
            expect(result.page).to.equal(Page.DragAndDrop);
            expect(result.view).to.equal(Page.DragAndDrop);
        });
    });
    describe("replaceUpload", () => {
        it("sets page and view", () => {
            const replacement = {
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    name: "test",
                },
                state: {
                    ...nonEmptyStateForInitiatingUpload,
                    route: {
                        ...nonEmptyStateForInitiatingUpload.route,
                        page: Page.AddCustomData,
                        view: Page.AddCustomData,
                    },

                },
            };
            const result = reducer(route, replaceUpload(replacement));
            expect(result.page).to.equal(Page.AddCustomData);
            expect(result.page).to.equal(Page.AddCustomData);
        });
    });
});
