import { AicsGridCell } from "@aics/aics-react-labkey";
import { flatten, isEmpty, isNil, sortBy, values } from "lodash";
import { createSelector } from "reselect";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import { getWellLabel } from "../../util";

import { getAnnotations, getImagingSessions, getLookupAnnotationTypeId, getUnits } from "../metadata/selectors";
import { ImagingSession, Unit } from "../metadata/types";
import { Annotation } from "../template/types";
import { State } from "../types";
import {
    ImagingSessionIdToPlateMap,
    ImagingSessionIdToWellsMap,
    PlateResponse,
    Solution,
    SolutionLot,
    Well,
    WellResponse,
} from "./types";

// BASIC SELECTORS
export const getSelectedBarcode = (state: State) => state.selection.present.barcode;
export const getSelectedPlates = (state: State) => state.selection.present.plate;
export const getSelectedFiles = (state: State) => state.selection.present.files;
export const getStagedFiles = (state: State) => state.selection.present.stagedFiles;
export const getWells = (state: State) => state.selection.present.wells;
export const getSelectedWorkflows = (state: State) => state.selection.present.selectedWorkflows;
export const getSelectedWells = (state: State) => state.selection.present.selectedWells;
export const getAnnotation = (state: State) => state.selection.present.annotation;
export const getUser = (state: State) => state.selection.present.user;
export const getCurrentSelectionIndex = (state: State) => state.selection.index;
export const getSelectedImagingSessionId = (state: State) => state.selection.present.imagingSessionId;
export const getSelectedImagingSessionIds = (state: State) => state.selection.present.imagingSessionIds;
export const getTemplateEditorVisible = (state: State) => state.selection.present.templateEditorVisible;
export const getOpenTemplateModalVisible = (state: State) => state.selection.present.openTemplateModalVisible;
export const getExpandedUploadJobRows = (state: State) => state.selection.present.expandedUploadJobRows;
export const getFolderTreeOpen = (state: State) => state.selection.present.folderTreeOpen;
export const getSettingsEditorVisible = (state: State) => state.selection.present.settingsEditorVisible;

// COMPOSED SELECTORS
export const NO_UNIT = "(Unit Not Found)";
export const getAnnotationIsLookup = createSelector([
    getAnnotation,
    getAnnotations,
    getLookupAnnotationTypeId,
], (ann: string, annotations?: Annotation[], lookupAnnotationTypeId?: number) => {
    if (!annotations || !lookupAnnotationTypeId) {
        return false;
    } else {
        const match = annotations.find((a) => a.name === ann);
        return !!match && match.annotationTypeId === lookupAnnotationTypeId;
    }
});
export const getSelectedPlate = createSelector([
    getSelectedPlates,
    getSelectedImagingSessionId,
], (
    imagingSessionIdToPlate: ImagingSessionIdToPlateMap,
    selectedImagingSessionId?: number
): PlateResponse | undefined => {
    selectedImagingSessionId = !selectedImagingSessionId ? 0 : selectedImagingSessionId;
    return imagingSessionIdToPlate[selectedImagingSessionId];
});

export const getSelectedPlateId = createSelector([
    getSelectedPlate,
], (selectedPlate?: PlateResponse): number | undefined => selectedPlate ? selectedPlate.plateId : undefined);

export const getWellsForSelectedPlate = createSelector([
    getWells,
    getSelectedImagingSessionId,
], (imagingSessionIdToWells: ImagingSessionIdToWellsMap, selectedImagingSessionId?: number) => {
    selectedImagingSessionId = !selectedImagingSessionId ? 0 : selectedImagingSessionId;
    return imagingSessionIdToWells[selectedImagingSessionId] || [];
});

export const getWellsWithModified = createSelector([
    getWellsForSelectedPlate,
    getSelectedPlateId,
], (wells: WellResponse[], plateId?: number): Well[][] => {
    if (!wells || wells.length === 0 || !plateId) {
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
                plateId,
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

export const getSelectedWellIds = createSelector([
    getSelectedWells,
    getSelectedWellsWithData,
], (selectedCells: GridCell[], wells: Well[]) => {
    return wells.map((w) => w.wellId);
});

export const getSelectedImagingSession = createSelector([
    getImagingSessions,
    getSelectedImagingSessionId,
], (imagingSessions: ImagingSession[], imagingSessionId?: number): ImagingSession | undefined => {
    return isNil(imagingSessionId) ? undefined :
        imagingSessions.find((is) => is.imagingSessionId === imagingSessionId);
});

export const getAllWells = createSelector([
    getWells,
], (wells: ImagingSessionIdToWellsMap) => {
    return flatten(values(wells));
});

export const getAllPlates = createSelector([
    getSelectedPlates,
], (selectedPlates: ImagingSessionIdToPlateMap) => {
    return flatten(values(selectedPlates));
});
