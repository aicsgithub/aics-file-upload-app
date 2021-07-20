import { expect } from "chai";

import { updateSettings } from "../../setting/actions";
import { mockSelection } from "../../test/mocks";
import { Page, RouteStateBranch } from "../../types";
import { selectPage } from "../actions";
import reducer from "../reducer";

describe("route reducer", () => {
  let route: RouteStateBranch;
  beforeEach(() => {
    route = {
      ...mockSelection,
      page: Page.MyUploads,
      view: Page.MyUploads,
    };
  });
  describe("selectPage", () => {
    it("sets page and view to payload.nextPage", () => {
      const result = reducer(route, selectPage(Page.UploadWithTemplate));
      expect(result.page).to.equal(Page.UploadWithTemplate);
      expect(result.view).to.equal(Page.UploadWithTemplate);
    });
  });

  describe("updateSettings", () => {
    it("Sets view back to the page", () => {
      const routeStateBefore = {
        view: Page.Settings,
        page: Page.MyUploads,
      };
      const expectedRouteState = {
        view: Page.MyUploads,
        page: Page.MyUploads,
      };
      const result = reducer(routeStateBefore, updateSettings({}));
      expect(result).to.deep.equal(expectedRouteState);
    });
  });
});
