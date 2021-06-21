import { expect } from "chai";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import { JSSJobStatus } from "../../../services/job-status-client/types";
import {
  CellPopulation,
  PlateResponse,
  Solution,
  WellResponse,
} from "../../../services/mms-client/types";
import { ROW_COUNT_COLUMN } from "../../constants";
import {
  getMockStateWithHistory,
  mockJob,
  mockPlate,
  mockSelectedWells,
  mockSelection,
  mockState,
  mockUnits,
  mockWell,
  mockWells,
} from "../../test/mocks";
import { State } from "../../types";
import {
  getAllPlates,
  getAllWells,
  getAreSelectedUploadsInFlight,
  getMassEditRowAsTableRow,
  getSelectedImagingSession,
  getSelectedPlate,
  getSelectedPlateId,
  getSelectedWellIds,
  getSelectedWellLabels,
  getSelectedWellsWithData,
  getWellIdToWellMap,
  getWellsWithModified,
  getWellsWithUnitsAndModified,
  NO_UNIT,
} from "../selectors";
import { Well } from "../types";

describe("Selections selectors", () => {
  let mockEmptyWell: Well;
  let mockCellPopulation: CellPopulation;
  let mockSolution: Solution;
  let mockStateWithNonEmptyWell: State;

  beforeEach(() => {
    mockEmptyWell = {
      cellPopulations: [],
      col: 0,
      plateId: 1,
      row: 0,
      solutions: [],
      wellId: 1,
    };

    mockCellPopulation = {
      seedingDensity: "200",
      wellCellPopulation: {
        cellPopulationId: 1,
      },
    };

    mockSolution = {
      solutionLot: {
        concentration: 10,
        concentrationUnitsId: 2,
        dilutionFactorPart: 1,
        dilutionFactorTotal: 1000,
        solutionName: "testSolution",
      },
      volume: "100",
      volumeUnitsId: 1,
    };

    const mockWell: WellResponse = {
      ...mockEmptyWell,
      cellPopulations: [mockCellPopulation],
      solutions: [mockSolution],
    };

    mockStateWithNonEmptyWell = {
      ...mockState,
      metadata: {
        ...mockState.metadata,
        units: mockUnits,
      },
      selection: {
        ...mockState.selection,
        present: {
          ...mockSelection,
          wells: { 0: [mockWell] },
        },
      },
    };
  });

  const expectOneWell = (wells: Well[][]) => {
    expect(wells.length).to.equal(1);
    expect(wells[0].length).to.equal(1);
  };

  describe("getSelectedPlate", () => {
    it("returns undefined if no barcode selected yet", () => {
      const result: PlateResponse | undefined = getSelectedPlate({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          plate: {},
        }),
      });
      expect(result).to.be.undefined;
    });

    it("returns plate corresponding to 0 imaging session id if no imaging session selected", () => {
      const result: PlateResponse | undefined = getSelectedPlate(mockState);
      expect(result).to.equal(getAllPlates(mockState)[0]);
    });

    it("returns plate corresponding to the imaging session id selected", () => {
      const result: PlateResponse | undefined = getSelectedPlate({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          imagingSessionId: 1,
        }),
      });
      expect(result).to.equal(mockPlate[1]);
    });
  });

  describe("getSelectedPlateId", () => {
    it("returns undefined if no plate selected", () => {
      const result: number | undefined = getSelectedPlateId({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          plate: {},
        }),
      });
      expect(result).to.be.undefined;
    });

    it("returns the id of the plate that is selected", () => {
      const result: number | undefined = getSelectedPlateId({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          imagingSessionId: 1,
        }),
      });
      expect(result).to.equal(2);
    });
  });

  describe("getWellsWithModified", () => {
    it("sets modified as true on wells with cellPopulations", () => {
      const result: Well[][] = getWellsWithModified({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: {
            0: [
              {
                ...mockEmptyWell,
                cellPopulations: [mockCellPopulation],
              },
            ],
          },
        }),
      });

      expectOneWell(result);
      if (result && result[0][0]) {
        expect(result[0][0].modified).to.be.true;
      }
    });
    it("sets modified as true on wells with solutions", () => {
      const result: Well[][] = getWellsWithModified({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: {
            0: [
              {
                ...mockEmptyWell,
                solutions: [mockSolution],
              },
            ],
          },
        }),
      });

      expectOneWell(result);
      if (result && result[0][0]) {
        expect(result[0][0].modified).to.be.true;
      }
    });

    it("sets modified as false on wells without modifications", () => {
      const result: Well[][] = getWellsWithModified({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: { 0: [mockEmptyWell] },
        }),
      });

      expectOneWell(result);
      if (result && result[0][0]) {
        expect(result[0][0].modified).to.be.false;
      }
    });
  });

  describe("getWellsWithUnitsAndModified", () => {
    it("returns wells if no units", () => {
      const result = getWellsWithUnitsAndModified({
        ...mockStateWithNonEmptyWell,
        metadata: {
          ...mockState.metadata,
          units: [],
        },
      });

      expectOneWell(result);
      if (result && result[0][0]) {
        const well = result[0][0];
        expect(well.solutions[0].volumeUnitDisplay).to.equal(NO_UNIT);
        expect(
          well.solutions[0].solutionLot.concentrationUnitsDisplay
        ).to.equal(NO_UNIT);
      }
    });

    it("returns empty array if no wells", () => {
      const result = getWellsWithUnitsAndModified({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          units: mockUnits,
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: [],
        }),
      });
      expect(result).to.be.empty;
    });

    it("populates display values", () => {
      const result = getWellsWithUnitsAndModified(mockStateWithNonEmptyWell);

      expectOneWell(result);
      if (result && result[0][0]) {
        const well = result[0][0];
        expect(well.solutions[0].volumeUnitDisplay).to.equal("unit1");
        expect(
          well.solutions[0].solutionLot.concentrationUnitsDisplay
        ).to.equal("unit2");
      }
    });
  });

  describe("getSelectedWellLabels", () => {
    it("returns array of well labels of the selected wells", () => {
      const arr = getSelectedWellLabels({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: mockSelectedWells,
        }),
      });
      expect(arr[0]).to.equal("A1");
      expect(arr[1]).to.equal("A2");
      expect(arr[2]).to.equal("B1");
      expect(arr[3]).to.equal("B2");
    });

    it("returns an empty array if no selected wells", () => {
      const arr = getSelectedWellLabels({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: [],
        }),
      });
      expect(arr).to.be.empty;
    });
  });

  describe("getSelectedWellsWithData", () => {
    it("returns array of wells with all of the data on a well (ex. wellId)", () => {
      const arr = getSelectedWellsWithData({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: mockSelectedWells,
          wells: mockWells,
        }),
      });
      expect(arr[0].wellId).to.equal(1);
      expect(arr[1].wellId).to.equal(2);
      expect(arr[2].wellId).to.equal(3);
      expect(arr[3].wellId).to.equal(4);
    });

    it("returns an empty array if no selected wells", () => {
      const arr = getSelectedWellsWithData({
        ...mockState,
        metadata: {
          ...mockState.metadata,
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: [],
        }),
      });
      expect(arr).to.be.empty;
    });
  });

  describe("getSelectedImagingSession", () => {
    it("returns undefined if imaging session id is undefined", () => {
      const result = getSelectedImagingSession({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          imagingSessions: [
            {
              description: "",
              imagingSessionId: 1,
              name: "1 Week",
            },
          ],
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          imagingSessionId: undefined,
        }),
      });
      expect(result).to.be.undefined;
    });

    it("returns matching imaging session if imagingsessionid defined", () => {
      const result = getSelectedImagingSession({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          imagingSessions: [
            {
              description: "",
              imagingSessionId: 1,
              name: "1 Week",
            },
          ],
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          imagingSessionId: 1,
        }),
      });
      expect(result).to.not.be.undefined;
    });
  });

  describe("getSelectedWellIds", () => {
    it("returns empty list if no selected wells", () => {
      const result = getSelectedWellIds(mockState);
      expect(result).to.be.empty;
    });
    it("returns well ids of selected wells", () => {
      const result = getSelectedWellIds({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: [{ col: 0, row: 0 }],
        }),
      });
      expect(result.length).to.equal(1);
      expect(result[0]).to.equal(1);
    });
  });

  describe("getAllWells", () => {
    it("returns all wells from all imaging sessions in a flat list", () => {
      const result = getAllWells({
        ...mockState,
        selection: getMockStateWithHistory(mockSelection),
      });
      expect(result.length).to.equal(7);
    });
  });

  describe("getAllPlates", () => {
    it("returns all plates from all imaging sessions", () => {
      const result = getAllPlates({
        ...mockState,
        selection: getMockStateWithHistory(mockSelection),
      });
      expect(result.length).to.equal(2);
    });
  });

  describe("getWellIdToWellMap", () => {
    it("converts a list of wells to a wellId to well map", () => {
      const result = getWellIdToWellMap({
        ...mockState,
        selection: getMockStateWithHistory(mockSelection),
      });
      expect(result.get(1)).to.deep.equal(mockWell);
      expect(result.get(2)).to.deep.equal({
        ...mockWell,
        col: 1,
        row: 0,
        wellId: 2,
      });
      expect(result.get(3)).to.deep.equal({
        ...mockWell,
        col: 0,
        row: 1,
        wellId: 3,
      });
      expect(result.get(4)).to.deep.equal({
        ...mockWell,
        col: 1,
        row: 1,
        wellId: 4,
      });
      expect(result.get(5)).to.deep.equal({
        ...mockWell,
        cellPopulations: [],
        col: 2,
        row: 0,
        wellId: 5,
      });
      expect(result.get(6)).to.deep.equal({
        ...mockWell,
        cellPopulations: [],
        col: 2,
        row: 1,
        wellId: 6,
      });
      expect(result.get(10)).to.deep.equal({
        ...mockWell,
        plateId: 2,
        wellId: 10,
      });
      expect(result.size).to.equal(7);
    });
  });

  describe("getAreSelectedUploadsInFlight", () => {
    it("returns false without job selected", () => {
      // Act
      const result = getAreSelectedUploadsInFlight(mockState);

      // Assert
      expect(result).to.be.false;
    });

    [JSSJobStatus.SUCCEEDED, JSSJobStatus.FAILED].forEach((status) => {
      it(`returns false with job selected and job status ${status}`, () => {
        // Act
        const state = {
          ...mockState,
          selection: getMockStateWithHistory({
            ...mockSelection,
            job: {
              ...mockJob,
              status,
            },
          }),
        };
        const result = getAreSelectedUploadsInFlight(state);

        // Assert
        expect(result).to.be.false;
      });
    });

    [
      JSSJobStatus.UNRECOVERABLE,
      JSSJobStatus.WORKING,
      JSSJobStatus.RETRYING,
      JSSJobStatus.WAITING,
      JSSJobStatus.BLOCKED,
    ].forEach((status) => {
      it(`returns true with job selected and job status ${status}`, () => {
        // Act
        const state = {
          ...mockState,
          selection: getMockStateWithHistory({
            ...mockSelection,
            job: {
              ...mockJob,
              status,
            },
          }),
        };
        const result = getAreSelectedUploadsInFlight(state);

        // Assert
        expect(result).to.be.true;
      });
    });
  });

  describe("getMassEditRowAsTableRow", () => {
    it("returns row with count and wellLabels", () => {
      // Arrange
      const wellId1 = 4;
      const wellId2 = 7;
      const massEditRow = {
        CellLine: ["AICS-0"],
        Color: ["Blue", "Green"],
        [WELL_ANNOTATION_NAME]: [wellId1, wellId2],
      };
      const rowsSelectedForMassEdit = ["1", "39", "62"];
      const state = {
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          massEditRow,
          rowsSelectedForMassEdit,
          wells: {
            0: [
              {
                row: 0,
                col: 0,
                plateId: 13,
                wellId: wellId1,
                cellPopulations: [],
                solutions: [],
              },
              {
                row: 0,
                col: 1,
                plateId: 13,
                wellId: wellId2,
                cellPopulations: [],
                solutions: [],
              },
            ],
          },
        }),
      };

      // Act
      const result = getMassEditRowAsTableRow(state);

      // Assert
      expect(result).to.deep.equal({
        ...massEditRow,
        [ROW_COUNT_COLUMN]: rowsSelectedForMassEdit.length,
        wellLabels: ["A1", "A2"],
      });
    });
  });
});
