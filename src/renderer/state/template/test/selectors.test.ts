import { expect } from "chai";

import {
  mockFavoriteColorAnnotation,
  mockNotesAnnotation,
  mockState,
  mockWellAnnotation,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { getCompleteAppliedTemplate } from "../selectors";

describe("Template selectors", () => {
  describe("getCompleteAppliedTemplate", () => {
    it("adds annotations for notes and wells", () => {
      const result = getCompleteAppliedTemplate(
        nonEmptyStateForInitiatingUpload
      );
      expect(result).to.not.be.undefined;
      if (result) {
        const annotationIds = result.annotations.map((a) => a.annotationId);
        expect(annotationIds).to.contain(mockNotesAnnotation.annotationId);
        expect(annotationIds).to.contain(mockWellAnnotation.annotationId);
      }
    });
    it("returns undefined if template has not been applied", () => {
      const result = getCompleteAppliedTemplate(mockState);
      expect(result).to.be.undefined;
    });
    it("throws error if notes annotation not found", () => {
      expect(() =>
        getCompleteAppliedTemplate({
          ...nonEmptyStateForInitiatingUpload,
          metadata: {
            ...nonEmptyStateForInitiatingUpload.metadata,
            annotations: [mockWellAnnotation, mockFavoriteColorAnnotation],
          },
        })
      ).to.throw();
    });
    it("throws error if well annotation not found", () => {
      expect(() =>
        getCompleteAppliedTemplate({
          ...nonEmptyStateForInitiatingUpload,
          metadata: {
            ...nonEmptyStateForInitiatingUpload.metadata,
            annotations: [mockNotesAnnotation, mockFavoriteColorAnnotation],
          },
        })
      ).to.throw();
    });
    it("adds annotation type names to all annotations", () => {
      const result = getCompleteAppliedTemplate(
        nonEmptyStateForInitiatingUpload
      );
      expect(result).to.not.be.undefined;
      if (result) {
        const types = result.annotations.map((a) => a.type).filter((t) => !!t);
        expect(types.length).to.equal(result.annotations.length);
      }
    });
  });
});
