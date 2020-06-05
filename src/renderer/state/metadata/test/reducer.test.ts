import { expect } from "chai";

import { closeUploadTab } from "../../route/actions";
import { mockState } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("metadata reducer", () => {
  const filePath = "/foo/bar/test.json";
  describe("replaceUpload", () => {
    it("sets currentUploadFilePath", () => {
      const result = reducer(initialState, replaceUpload(filePath, mockState));
      expect(result.currentUploadFilePath).to.not.be.undefined;
    });
  });
  describe("closeUploadTab", () => {
    it("clears currentUploadFilePath", () => {
      const result = reducer(
        {
          ...initialState,
          currentUploadFilePath: filePath,
        },
        closeUploadTab()
      );
      expect(result.currentUpload).to.be.undefined;
    });
  });
});
