import { expect } from "chai";

import { ColumnType } from "../../../services/labkey-client/types";
import {
  mockAuditInfo,
  mockNotesAnnotation,
  mockState,
  mockWellAnnotation,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
  getAnnotations,
  getAnnotationsWithAnnotationOptions,
  getBooleanAnnotationTypeId,
  getForbiddenAnnotationNames,
  getLookupAnnotationTypeId,
  getNotesAnnotation,
  getUniqueBarcodeSearchResults,
  getWellAnnotation,
} from "../selectors";

describe("Metadata selectors", () => {
  describe("getUniqueBarcodeSearchResults", () => {
    it("groups by barcode and combines imagingSessionIds", () => {
      const barcode1 = "barcode1";
      const barcode2 = "barcode2";
      const barcodeSearchResults = [
        {
          barcode: barcode1,
          imagingSessionId: 1,
        },
        {
          barcode: barcode2,
          imagingSessionId: null,
        },
        {
          barcode: barcode1,
          imagingSessionId: 2,
        },
      ];
      const results = getUniqueBarcodeSearchResults({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          barcodeSearchResults,
        },
      });

      expect(results.length).to.equal(2);
      expect(results).to.deep.include({
        barcode: barcode1,
        imagingSessionIds: [1, 2],
      });
      expect(results).to.deep.include({
        barcode: barcode2,
        imagingSessionIds: [null],
      });
    });
  });

  describe("getBooleanAnnotationTypeId", () => {
    it("returns id for annotation type with name matching BOOLEAN if found", () => {
      const result = getBooleanAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.BOOLEAN },
          ],
        },
      });
      expect(result).to.equal(2);
    });
    it("returns undefined if no annotation type has name matching BOOLEAN", () => {
      const result = getBooleanAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.LOOKUP },
          ],
        },
      });
      expect(result).to.equal(undefined);
    });
  });

  describe("getAnnotations", () => {
    it("returns only annotations that are meant to be exposed in this app", () => {
      const result = getAnnotations(nonEmptyStateForInitiatingUpload);
      expect(result).to.be.length(4);
    });
    it("returns empty array if no annotations found", () => {
      const result = getAnnotations({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotations: [],
        },
      });
      expect(result).to.be.empty;
    });
  });

  describe("getForbiddenAnnotations", () => {
    it("returns only annotations that are not meant to be exposed in this app", () => {
      const result = getForbiddenAnnotationNames(
        nonEmptyStateForInitiatingUpload
      );
      expect(result).to.be.length(1);
    });
    it("returns empty array if no annotations found", () => {
      const result = getForbiddenAnnotationNames({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotations: [],
        },
      });
      expect(result).to.be.empty;
    });
  });

  describe("getLookupAnnotationTypeId", () => {
    it("returns id for annotation type with name matching LOOKUP if found", () => {
      const result = getLookupAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.LOOKUP },
          ],
        },
      });
      expect(result).to.equal(2);
    });
    it("returns undefined if no annotation type has name matching LOOKUP", () => {
      const result = getLookupAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.BOOLEAN },
          ],
        },
      });
      expect(result).to.equal(undefined);
    });
  });
  describe("getNotesAnnotation", () => {
    it("returns annotation named Notes if found", () => {
      const result = getNotesAnnotation(nonEmptyStateForInitiatingUpload);
      expect(result).to.equal(mockNotesAnnotation);
    });
    it("returns undefined if Notes annotation not found", () => {
      const result = getNotesAnnotation(mockState);
      expect(result).to.be.undefined;
    });
  });
  describe("getWellAnnotation", () => {
    it("returns annotation named Well if found", () => {
      const result = getWellAnnotation(nonEmptyStateForInitiatingUpload);
      expect(result).to.equal(mockWellAnnotation);
    });
    it("returns undefined if Well annotation not found", () => {
      const result = getWellAnnotation(mockState);
      expect(result).to.be.undefined;
    });
  });
  describe("getAnnotationsWithAnnotationOptions", () => {
    const mockAnnotation = {
      ...mockAuditInfo,
      annotationId: 2,
      annotationTypeId: 3,
      description: "",
      exposeToFileUploadApp: true,
      name: "B",
    };
    const mockAnnotation2 = {
      ...mockAnnotation,
      annotationId: 3,
      name: "AA",
    };
    const mockAnnotation3 = {
      ...mockAnnotation,
      annotationId: 4,
      name: "AB",
    };
    it("adds annotation options to matching annotation if found and alphabetizes annotations by name", () => {
      const result = getAnnotationsWithAnnotationOptions({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationOptions: [
            {
              annotationId: mockAnnotation.annotationId,
              annotationOptionId: 1,
              value: "a",
            },
            {
              annotationId: mockAnnotation.annotationId,
              annotationOptionId: 1,
              value: "b",
            },
          ],
          annotations: [mockAnnotation, mockAnnotation2, mockAnnotation3],
        },
      });
      expect(result).to.deep.equal([
        {
          ...mockAnnotation2,
          annotationOptions: undefined,
        },
        {
          ...mockAnnotation3,
          annotationOptions: undefined,
        },
        {
          ...mockAnnotation,
          annotationOptions: ["a", "b"],
        },
      ]);
    });
  });
});
