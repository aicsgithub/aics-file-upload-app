import { AicsGridCell } from "@aics/aics-react-labkey";
import { isEmpty, sortBy } from "lodash";
import { createSelector } from "reselect";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import { getWellLabel } from "../../util";

import { getUnits } from "../metadata/selectors";
import { Unit } from "../metadata/types";
import { State } from "../types";
import {
    Solution,
    SolutionLot,
    Well,
    WellResponse
} from "./types";

// BASIC SELECTORS
export const getSelectedBarcode = (state: State) => state.selection.present.barcode;
export const getSelectedPlateId = (state: State) =>
    state.selection.present.plate && state.selection.present.plate.plateId;
export const getSelectedFiles = (state: State) => state.selection.present.files;
export const getPage = (state: State) => state.selection.present.page;
export const getView = (state: State) => state.selection.present.view;
export const getStagedFiles = (state: State) => state.selection.present.stagedFiles;
export const getWells = (state: State) => state.selection.present.wells;
export const getSelectedWorkflows = (state: State) => state.selection.present.selectedWorkflows;
export const getSelectedWells = (state: State) => state.selection.present.selectedWells;
export const getCurrentSelectionIndex = (state: State) => state.selection.index;
export const getSelectedImagingSessionId = (state: State) => state.selection.present.imagingSessionId;
export const getSelectedImagingSessionIds = (state: State) => state.selection.present.imagingSessionIds;
export const getTemplateEditorVisible = (state: State) => state.selection.present.templateEditorVisible;

// COMPOSED SELECTORS
export const NO_UNIT = "(Unit Not Found)";

export const getWellsWithModified = createSelector([
    getWells,
], (wells: WellResponse[]): Well[][] => {
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
            result[row][col] = {
                ...well,
                modified: !isEmpty(cellPopulations) || !isEmpty(solutions),
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
            const volumeUnit: Unit | undefined = units.find((u) => u.unitsId === s.volumeUnitsId);
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

        return {
            ...well,
            solutions,
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

export const getSelectedWellLabels = createSelector([
    getSelectedWells,
], (wells: AicsGridCell[]): string[] => {
    if (!wells || !wells.length) {
        return [];
    }

    return wells.map((well) => getWellLabel(well));
});

export const getSelectedWellsWithData = createSelector([
    getSelectedWells,
    getWellsWithUnitsAndModified,
], (selectedWells: GridCell[], wells: Well[][]): Well[] => {
    if (!wells || !wells.length || !selectedWells.length) {
        return [];
    }

    return selectedWells.map((well) => wells[well.row][well.col]);
});
