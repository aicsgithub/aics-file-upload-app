import { expect } from "chai";
import { closeUploadTab } from "../../route/actions";
import { mockState } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";

import { setCurrentUpload } from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";
import { CurrentUpload } from "../types";

describe("metadata reducer", () => {
  let currentUpload: CurrentUpload;
  beforeEach(() => {
    currentUpload = {
      created: new Date(),
      modified: new Date(),
      name: "foo",
    };
  });
  describe("replaceUpload", () => {
    it("sets currentUpload", () => {
      const result = reducer(
        initialState,
        replaceUpload({
          metadata: currentUpload,
          state: mockState,
        })
      );
      expect(result.currentUpload).to.not.be.undefined;
    });
  });
  describe("setCurrentUpload", () => {
    it("sets currentUpload", () => {
      const result = reducer(initialState, setCurrentUpload(currentUpload));
      expect(result.currentUpload).to.not.be.undefined;
    });
  });
  describe("closeUploadTab", () => {
    it("clears currentUpload", () => {
      const result = reducer(
        {
          ...initialState,
          currentUpload,
        },
        closeUploadTab()
      );
      expect(result.currentUpload).to.be.undefined;
    });
  });
});
