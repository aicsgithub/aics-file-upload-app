import { expect } from "chai";

import {
    getMockStateWithHistory,
    mockSelectedWells,
    mockSelection,
    mockState,
    mockUnits,
    mockWells,
} from "../../test/mocks";
import { State } from "../../types";
import {
    getSelectedImagingSession,
    getSelectedWellLabels,
    getSelectedWellsWithData,
    getWellIdToWellLabelMap,
    getWellsWithModified,
    getWellsWithUnitsAndModified,
    NO_UNIT,
} from "../selectors";
import { CellPopulation, Solution, Well, WellResponse } from "../types";

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

        mockSolution =  {
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
                    ...mockState.selection.present,
                    wells: {0: [mockWell]},
                },
            },
        };
    });

    const expectOneWell = (wells: Well[][]) => {
        expect(wells.length).to.equal(1);
        expect(wells[0].length).to.equal(1);
    };

    describe ("getWellsWithModified", () => {
        it("sets modified as true on wells with cellPopulations", () => {
            const result: Well[][] = getWellsWithModified({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: {0: [{
                        ...mockEmptyWell,
                        cellPopulations: [mockCellPopulation],
                    }]},
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
                    wells: {0: [{
                        ...mockEmptyWell,
                        solutions: [mockSolution],
                    }]},
                }),
            });

            expectOneWell(result);
            if (result && result[0][0]) {
                expect(result[0][0].modified).to.be.true;
            }
        });

        it ("sets modified as false on wells without modifications", () => {
            const result: Well[][] = getWellsWithModified({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: {0: [mockEmptyWell]},
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
                expect(well.solutions[0].solutionLot.concentrationUnitsDisplay).to.equal(NO_UNIT);
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
                expect(well.solutions[0].solutionLot.concentrationUnitsDisplay).to.equal("unit2");
            }
        });
    });

    describe("getWellIdToWellLabelMap", () => {
        it("returns map of wellIds to their labels", () => {
            const map = getWellIdToWellLabelMap({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: mockWells,
                }),
            });
            expect(map.get(1)).to.equal("A1");
            expect(map.get(2)).to.equal("A2");
            expect(map.get(3)).to.equal("B1");
            expect(map.get(4)).to.equal("B2");
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
                    imagingSessions: [ {
                        description: "",
                        imagingSessionId: 1,
                        name: "1 Week",
                    }],
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
                    imagingSessions: [ {
                        description: "",
                        imagingSessionId: 1,
                        name: "1 Week",
                    }],
                },
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    imagingSessionId: 1,
                }),
            });
            expect(result).to.not.be.undefined;
        });
    });
});
