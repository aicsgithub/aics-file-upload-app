import { expect } from "chai";

import { updateSettings } from "../../setting/actions";
import {
  mockSelection,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { Page, RouteStateBranch, State } from "../../types";
import { replaceUpload } from "../../upload/actions";
import { selectPage } from "../actions";
import reducer from "../reducer";

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
      const result = reducer(route, selectPage(Page.AddCustomData));
      expect(result.page).to.equal(Page.AddCustomData);
      expect(result.view).to.equal(Page.AddCustomData);
    });
  });
  describe("replaceUpload", () => {
    it("sets page and view", () => {
      const replacement: State = {
        ...nonEmptyStateForInitiatingUpload,
        route: {
          ...nonEmptyStateForInitiatingUpload.route,
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
      };
      const result = reducer(
        route,
        replaceUpload("/some/file.json", replacement)
      );
      expect(result.page).to.equal(Page.AddCustomData);
      expect(result.page).to.equal(Page.AddCustomData);
    });
  });

  describe("updateSettings", () => {
    it("Sets view back to the page", () => {
      const routeStateBefore = {
        view: Page.Settings,
        page: Page.UploadSummary,
      };
      const expectedRouteState = {
        view: Page.UploadSummary,
        page: Page.UploadSummary,
      };
      const result = reducer(routeStateBefore, updateSettings({}));
      expect(result).to.deep.equal(expectedRouteState);
    });
  });
});
