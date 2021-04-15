import { expect } from "chai";

import { closeModal } from "../../feedback/actions";
import { resetUpload } from "../../route/actions";
import { nonEmptyStateForInitiatingUpload } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";
import reducer from "../reducer";
import { initialState } from "../reducer";
import { getAppliedTemplate } from "../selectors";

describe("template reducer", () => {
  describe("replaceUpload", () => {
    it("sets appliedTemplate", () => {
      const result = reducer(
        initialState,
        replaceUpload("/path/file.json", nonEmptyStateForInitiatingUpload)
      );
      expect(result.appliedTemplate).to.equal(
        getAppliedTemplate(nonEmptyStateForInitiatingUpload)
      );
    });
  });
  describe("resetUpload", () => {
    it("clears appliedTemplate", () => {
      const result = reducer(
        nonEmptyStateForInitiatingUpload.template,
        resetUpload()
      );
      expect(result.appliedTemplate).to.be.undefined;
    });
  });

  describe("closeModal", () => {
    it("returns prev state if payload is not 'templateEditor'", () => {
      const result = reducer(initialState, closeModal("openTemplate"));
      expect(result).to.deep.equal(initialState);
    });
  });
});
