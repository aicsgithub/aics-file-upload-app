import { isEmpty, sortBy } from "lodash";
import { createSelector } from "reselect";
import { getWellLabel } from "../../util";

import { getUnits } from "../metadata/selectors";
import { Unit } from "../metadata/types";
import { State } from "../types";

import { GetViabilityResultResponse, Solution, SolutionLot, ViabilityResult, Well, WellResponse } from "./types";

// BASIC SELECTORS
export const getSelectedBarcode = (state: State) => state.selection.present.barcode;
export const getSelections = (state: State) => state.selection.present;
export const getSelectedFiles = (state: State) => state.selection.present.files;
export const getPage = (state: State) => state.selection.present.page;
export const getStagedFiles = (state: State) => state.selection.present.stagedFiles;
export const getWells = (state: State) => state.selection.present.wells;
export const getWell = (state: State) => state.selection.present.well;
export const getCurrentSelectionIndex = (state: State) => state.selection.index;
export const getViabilityResults = (state: State) => state.selection.present.viabilityResults;

// COMPOSED SELECTORS
export const NO_UNIT = "(Unit Not Found)";

export const getWellsWithModified = createSelector([
    getWells,
    getViabilityResults,
], (wells: WellResponse[], viabilityResultsForSelectedPlate: GetViabilityResultResponse[]): Well[][] => {
    if (!wells || wells.length === 0) {
        return [];
    }

    const sortedWells = sortBy(wells, ["row", "col"]);
    const rowCount = sortedWells[sortedWells.length - 1].row + 1;
    const colCount = sortedWells[sortedWells.length - 1].col + 1;

    const result: Well[][] = Array(rowCount).fill(null).map(() => Array(colCount).fill(null));
    wells.forEach(
        (well: WellResponse) => {
            const { cellPopulations, col, row, solutions } = well;
            const viabilityResults: ViabilityResult[] = viabilityResultsForSelectedPlate
                .filter((viabilityResult) => viabilityResult.col === col && viabilityResult.row === row);
            result[row][col] = {
                ...well,
                modified: !isEmpty(cellPopulations) || !isEmpty(solutions) || !isEmpty(viabilityResults),
                viabilityResults,
            };
        }
    );

    return result;
});

export const getWellsWithUnitsAndModified = createSelector([
    getWellsWithModified,
    getUnits,
], (wells: Well[][], units: Unit[]): Well[][] => {
    return wells.map((wellRow: Well[]) => wellRow.map((well) => {
        const solutions: Solution[] = well.solutions.map((s: Solution) => {
            const volumeUnit: Unit | undefined = units.find((u) => u.unitsId === s.volumeUnitId);
            const concentrationUnit: Unit | undefined = units
                .find((u) => u.unitsId === s.solutionLot.concentrationUnitsId);
            const solutionLot: SolutionLot = {
                ...s.solutionLot,
                concentrationUnitsDisplay: concentrationUnit ? concentrationUnit.name : NO_UNIT,
            };
            return {
                ...s,
                solutionLot,
                volumeUnitDisplay:  volumeUnit ? volumeUnit.name : NO_UNIT,
            };
        });
        const viabilityResults: ViabilityResult[] = well.viabilityResults.map((v: ViabilityResult) => {
            const suspensionVolumUnit: Unit | undefined = units.find((u) => u.unitsId === v.suspensionVolumeUnitId);
            const viableCellCountUnit: Unit | undefined = units.find((u) => u.unitsId === v.viableCellCountUnitId);
            return {
                ...v,
                suspensionVolumeUnitDisplay: suspensionVolumUnit ? suspensionVolumUnit.name : NO_UNIT,
                viableCellCountUnitDisplay: viableCellCountUnit ? viableCellCountUnit.name : NO_UNIT,
            };
        });

        return {
            ...well,
            solutions,
            viabilityResults,
        };
    }));
});

export const getWellIdToWellLabelMap = createSelector([
    getWells,
], (wells: WellResponse[]) => {
    const result = new Map<number, string>();
    wells.forEach(({ wellId, col, row }: WellResponse) => {
        result.set(wellId, getWellLabel({row, col}));
    });

    return result;
});
