import { expect } from "chai";

import { saveTemplateSucceeded } from "../../template/actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("setting reducer", () => {
  describe("saveTemplateSucceeded", () => {
    it("sets templateId", () => {
      const result = reducer(initialState, saveTemplateSucceeded(1));
      expect(result.templateId).to.equal(1);
    });
  });
});
