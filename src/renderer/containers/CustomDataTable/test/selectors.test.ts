import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { ColumnType } from "../../../services/labkey-client/types";
import {
  mockAuditInfo,
  mockJob,
  mockMMSTemplate,
  mockSelection,
  mockState,
  mockTemplateStateBranch,
} from "../../../state/test/mocks";
import WellCell from "../../Table/CustomCells/WellCell";
import { getColumnsForTable, getTemplateColumnsForTable } from "../selectors";

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
      annotationOptions: [],
      required: false,
    })
  );
  const appliedTemplate = {
    ...mockMMSTemplate,
    annotations,
  };

  describe("getTemplateColumnsForTable", () => {
    it("returns expected columns from template", () => {
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
      expect(actual).to.be.lengthOf(3);
      expect(actual).deep.equal(
        annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        }))
      );
    });

    it("returns columns from template and well", () => {
      // Arrange
      const expected = [
        {
          id: AnnotationName.WELL,
          Cell: WellCell,
          // This description was pulled from LK 03/22/21
          description:
            "A well on a plate (that has been entered into the Plate UI)",
          width: 100,
        },
        ...annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        })),
      ];

      // Act
      const actual = getTemplateColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        selection: {
          ...mockSelection,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual).to.be.lengthOf(4);
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
      expect(actual.length).to.equal(6);
      expect(actual.find((c) => c.id === "selection")).to.not.be.undefined;
      expect(actual.filter((c) => !c.isReadOnly)).to.be.lengthOf(6);
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
      expect(actual.length).to.equal(5);
      // Assert: ensure the only non-readonly columns are the defaults
      expect(actual.every((c) => c.isReadOnly)).to.be.true;
      expect(actual.find((c) => c.id === "selection")).to.be.undefined;
    });
  });
});
