import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { ColumnType } from "../../../services/labkey-client/types";
import {
  getMockStateWithHistory,
  mockAuditInfo,
  mockJob,
  mockMMSTemplate,
  mockSelection,
  mockState,
  mockTemplateStateBranch,
} from "../../../state/test/mocks";
import {
  getColumnsForTable,
  getTemplateColumnsForTable,
  IMAGING_SESSION_COLUMN,
  PLATE_BARCODE_COLUMN,
  WELL_COLUMN,
} from "../selectors";

describe("CustomDataTable selectors", () => {
  const annotationTypes = [
    ColumnType.LOOKUP,
    ColumnType.TEXT,
    ColumnType.BOOLEAN,
  ].map((name, index) => ({
    name,
    annotationTypeId: index,
  }));
  const annotations = ["Cell Line", "Color", "Is Aligned"].map(
    (name, index) => ({
      ...mockAuditInfo,
      annotationId: index,
      name,
      description: `${name} description`,
      annotationTypeId: index === 0 ? 0 : 1,
      orderIndex: index,
      annotationOptions: [],
      required: false,
    })
  );
  const appliedTemplate = {
    ...mockMMSTemplate,
    annotations,
  };

  describe("getTemplateColumnsForTable", () => {
    it("returns plate and expected columns from template", () => {
      // Act
      const actual = getTemplateColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual).to.be.lengthOf(4);
      expect(actual).deep.equal([
        PLATE_BARCODE_COLUMN,
        ...annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        })),
      ]);
    });

    it("sorts annotations according to orderIndex", () => {
      // Arrange
      const state = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      };

      // Act
      const actual = getTemplateColumnsForTable(state);

      // Assert
      expect(actual).to.be.lengthOf(4);
      actual.slice(1).forEach((column, index) => {
        const match = annotations.find((a) => a.orderIndex === index);
        expect(column.accessor).to.deep.equal(match?.name);
      });
    });

    it("includes well when plate barcode is present in upload", () => {
      // Arrange
      const expected = [
        PLATE_BARCODE_COLUMN,
        WELL_COLUMN,
        ...annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        })),
      ];
      const plateBarcode = "12391013";

      // Act
      const actual = getTemplateColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
          plateBarcodeToImagingSessions: {
            [plateBarcode]: {
              [0]: {
                wells: [],
              },
            },
          },
        },
        selection: {
          ...mockSelection,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
        upload: getMockStateWithHistory({
          "file-1.txt": {
            file: "file-1.txt",
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        }),
      });

      // Assert
      expect(actual).to.be.lengthOf(5);
      expect(actual).deep.equal(expected);
    });

    it("returns imaging session when plate barcode has imaging sessions", () => {
      // Arrange
      const expected = [
        PLATE_BARCODE_COLUMN,
        IMAGING_SESSION_COLUMN,
        WELL_COLUMN,
        ...annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        })),
      ];
      const plateBarcode = "1234145";

      // Act
      const actual = getTemplateColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
          plateBarcodeToImagingSessions: {
            [plateBarcode]: {
              [4]: {
                name: "imaging session 1",
                imagingSessionId: 4,
                wells: [],
              },
            },
          },
        },
        selection: {
          ...mockSelection,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
        upload: getMockStateWithHistory({
          "file-1.txt": {
            file: "file-1.txt",
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        }),
      });

      // Assert
      expect(actual).to.be.lengthOf(6);
      expect(actual).deep.equal(expected);
    });

    it("includes well and imaging session when mass edit row has plate barcode", () => {
      // Arrange
      const expected = [
        PLATE_BARCODE_COLUMN,
        IMAGING_SESSION_COLUMN,
        WELL_COLUMN,
        ...annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        })),
      ];
      const plateBarcode = "1234145";

      // Act
      const actual = getTemplateColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
          plateBarcodeToImagingSessions: {
            [plateBarcode]: {
              [4]: {
                name: "imaging session 1",
                imagingSessionId: 4,
                wells: [],
              },
            },
          },
        },
        selection: {
          ...mockSelection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
        upload: getMockStateWithHistory({
          "file-1.txt": {
            file: "file-1.txt",
          },
        }),
      });

      // Assert
      expect(actual).to.be.lengthOf(6);
      expect(actual).deep.equal(expected);
    });
  });

  describe("getColumnsForTable", () => {
    it("includes selection, file, and notes columns", () => {
      // Act
      const actual = getColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual.length).to.equal(7);
      expect(actual.find((c) => c.id === "selection")).to.not.be.undefined;
      expect(actual.filter((c) => !c.isReadOnly)).to.be.lengthOf(7);
    });

    it("sets columns to read only", () => {
      // Act
      const actual = getColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        selection: {
          ...mockSelection,
          uploads: [mockJob],
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual.length).to.equal(6);
      // Assert: ensure the only non-readonly columns are the defaults
      expect(actual.every((c) => c.isReadOnly)).to.be.true;
      expect(actual.find((c) => c.id === "selection")).to.be.undefined;
    });
  });
});
