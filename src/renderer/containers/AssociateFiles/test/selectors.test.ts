import { expect } from "chai";

import {
  getMockStateWithHistory,
  mockSelectedWells,
  mockSelectedWorkflows,
  mockSelection,
  mockState,
  mockWells,
} from "../../../state/test/mocks";
import {
  getMutualUploadsForWells,
  getMutualUploadsForWorkflows,
} from "../selectors";

describe("AssociateFiles selectors", () => {
  describe("getMutualUploadsForWells", () => {
    it("returns uploads that are shared by the selected wells", () => {
      const result = getMutualUploadsForWells({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: mockSelectedWells.slice(0, 3),
          wells: mockWells,
        }),
      });
      expect(result[0].file).to.equal("/path/to/file3");
      expect(result.length).to.equal(1);
    });

    it("returns an empty array if no selected wells", () => {
      const arr = getMutualUploadsForWells({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: [],
        }),
      });
      expect(arr).to.be.empty;
    });

    it("returns an empty array if no mutual uploads", () => {
      const arr = getMutualUploadsForWells({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: mockSelectedWells,
        }),
      });
      expect(arr).to.be.empty;
    });
  });
  describe("getMutualUploadsForWorkflows", () => {
    it("returns uploads that are shared by the selected workflows", () => {
      const result = getMutualUploadsForWorkflows({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWorkflows: mockSelectedWorkflows.slice(0, 1),
        }),
      });
      expect(result[0].file).to.equal("/path/to/file1");
      expect(result[1].file).to.equal("/path/to/file2");
      expect(result.length).to.equal(2);
    });

    it("returns an empty array if no mutual uploads", () => {
      const arr = getMutualUploadsForWorkflows({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWorkflows: mockSelectedWorkflows,
        }),
      });
      expect(arr).to.be.empty;
    });

    it("returns an empty array if no selected workflows", () => {
      const arr = getMutualUploadsForWorkflows({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWorkflows: [],
        }),
      });
      expect(arr).to.be.empty;
    });
  });
});
