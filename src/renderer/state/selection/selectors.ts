import { AicsGridCell } from "@aics/aics-react-labkey";
import { flatten, isEmpty, isNil, sortBy, values } from "lodash";
import { createSelector } from "reselect";

import { WELL_ANNOTATION_NAME } from "../../constants";
import { GridCell } from "../../entities";
import { JSSJobStatus } from "../../services/job-status-client/types";
import { ImagingSession, Unit } from "../../services/labkey-client/types";
import {
  PlateResponse,
  Solution,
  SolutionLot,
  WellResponse,
} from "../../services/mms-client/types";
import { getWellLabel, getWellLabelAndImagingSessionName } from "../../util";
import { ROW_COUNT_COLUMN } from "../constants";
import { getImagingSessions, getUnits } from "../metadata/selectors";
import {
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  MassEditRow,
  State,
} from "../types";

import { Well } from "./types";

// BASIC SELECTORS
export const getCellAtDragStart = (state: State) =>
  state.selection.present.cellAtDragStart;
export const getRowsSelectedForDragEvent = (state: State) =>
  state.selection.present.rowsSelectedForDragEvent;
export const getHasNoPlateToUpload = (state: State) =>
  state.selection.present.hasNoPlateToUpload;
export const getSelectedBarcode = (state: State) =>
  state.selection.present.barcode;
export const getSelectedPlates = (state: State) =>
  state.selection.present.plate;
export const getWells = (state: State) => state.selection.present.wells;
export const getSelectedWells = (state: State) =>
  state.selection.present.selectedWells;
export const getSelectedUser = (state: State) => state.selection.present.user;
export const getCurrentSelectionIndex = (state: State) => state.selection.index;
export const getRowsSelectedForMassEdit = (state: State) =>
  state.selection.present.rowsSelectedForMassEdit;
export const getSelectedImagingSessionId = (state: State) =>
  state.selection.present.imagingSessionId;
export const getSelectedImagingSessionIds = (state: State) =>
  state.selection.present.imagingSessionIds;
export const getSubFileSelectionModalFile = (state: State) =>
  state.selection.present.subFileSelectionModalFile;
export const getSelectedUploads = (state: State) =>
  state.selection.present.uploads;
export const getMassEditRow = (state: State) =>
  state.selection.present.massEditRow;

// COMPOSED SELECTORS
export const NO_UNIT = "(Unit Not Found)";
export const getSelectedPlate = createSelector(
  [getSelectedPlates, getSelectedImagingSessionId],
  (
    imagingSessionIdToPlate: ImagingSessionIdToPlateMap,
    selectedImagingSessionId?: number
  ): PlateResponse | undefined => {
    selectedImagingSessionId = !selectedImagingSessionId
      ? 0
      : selectedImagingSessionId;
    return imagingSessionIdToPlate[selectedImagingSessionId];
  }
);

export const getSelectedPlateId = createSelector(
  [getSelectedPlate],
  (selectedPlate?: PlateResponse): number | undefined =>
    selectedPlate ? selectedPlate.plateId : undefined
);

export const getWellsForSelectedPlate = createSelector(
  [getWells, getSelectedImagingSessionId],
  (
    imagingSessionIdToWells: ImagingSessionIdToWellsMap,
    selectedImagingSessionId?: number
  ) => {
    selectedImagingSessionId = !selectedImagingSessionId
      ? 0
      : selectedImagingSessionId;
    return imagingSessionIdToWells[selectedImagingSessionId] || [];
  }
);

export const getWellsWithModified = createSelector(
  [getWellsForSelectedPlate, getSelectedPlateId],
  (wells: WellResponse[], plateId?: number): Well[][] => {
    if (!wells || wells.length === 0 || !plateId) {
      return [];
    }

    const sortedWells = sortBy(wells, ["row", "col"]);
    const rowCount = sortedWells[sortedWells.length - 1].row + 1;
    const colCount = sortedWells[sortedWells.length - 1].col + 1;

    const result: Well[][] = Array(rowCount)
      .fill(null)
      .map(() => Array(colCount).fill(null));
    wells.forEach((well: WellResponse) => {
      const { cellPopulations, col, row, solutions } = well;
      result[row][col] = {
        ...well,
        modified: !isEmpty(cellPopulations) || !isEmpty(solutions),
        plateId,
      };
    });

    return result;
  }
);

export const getWellsWithUnitsAndModified = createSelector(
  [getWellsWithModified, getUnits],
  (wells: Well[][], units: Unit[]): Well[][] => {
    return wells.map((wellRow: Well[]) =>
      wellRow.map((well) => {
        const solutions: Solution[] = well.solutions.map((s: Solution) => {
          const volumeUnit: Unit | undefined = units.find(
            (u) => u.unitsId === s.volumeUnitsId
          );
          const concentrationUnit: Unit | undefined = units.find(
            (u) => u.unitsId === s.solutionLot.concentrationUnitsId
          );
          const solutionLot: SolutionLot = {
            ...s.solutionLot,
            concentrationUnitsDisplay: concentrationUnit
              ? concentrationUnit.name
              : NO_UNIT,
          };
          return {
            ...s,
            solutionLot,
            volumeUnitDisplay: volumeUnit ? volumeUnit.name : NO_UNIT,
          };
        });

        return {
          ...well,
          solutions,
        };
      })
    );
  }
);

export const getSelectedWellLabels = createSelector(
  [getSelectedWells],
  (wells: AicsGridCell[]): string[] => {
    if (!wells || !wells.length) {
      return [];
    }

    return wells.map((well) => getWellLabel(well));
  }
);

export const getSelectedWellsWithData = createSelector(
  [getSelectedWells, getWellsWithUnitsAndModified],
  (selectedWells: GridCell[], wells: Well[][]): Well[] => {
    if (!wells || !wells.length || !selectedWells.length) {
      return [];
    }

    return selectedWells.map((well) => wells[well.row][well.col]);
  }
);

export const getSelectedWellIds = createSelector(
  [getSelectedWells, getSelectedWellsWithData],
  (selectedCells: GridCell[], wells: Well[]) => {
    return wells.map((w) => w.wellId);
  }
);

export const getSelectedImagingSession = createSelector(
  [getImagingSessions, getSelectedImagingSessionId],
  (
    imagingSessions: ImagingSession[],
    imagingSessionId?: number
  ): ImagingSession | undefined => {
    return isNil(imagingSessionId)
      ? undefined
      : imagingSessions.find((is) => is.imagingSessionId === imagingSessionId);
  }
);

export const getAllWells = createSelector(
  [getWells],
  (wells: ImagingSessionIdToWellsMap) => {
    return flatten(values(wells));
  }
);

export const getWellIdToWellMap = createSelector(
  [getAllWells],
  (wells: WellResponse[]) => {
    return wells.reduce(
      (accum: Map<number, WellResponse>, well: WellResponse) => {
        accum.set(well.wellId, well);
        return accum;
      },
      new Map<number, WellResponse>()
    );
  }
);

export const getAllPlates = createSelector(
  [getSelectedPlates],
  (selectedPlates: ImagingSessionIdToPlateMap) => {
    return flatten(values(selectedPlates));
  }
);

export const getIsExistingUpload = createSelector(
  [getSelectedUploads],
  (uploads): boolean => uploads.length !== 0
);

export const getAreSelectedUploadsInFlight = createSelector(
  [getSelectedUploads],
  (selectedUploads): boolean =>
    selectedUploads.some(
      (upload) =>
        ![JSSJobStatus.SUCCEEDED, JSSJobStatus.FAILED].includes(upload.status)
    )
);

// Maps MassEditRow to shape of data needed by react-table
export const getMassEditRowAsTableRow = createSelector(
  [
    getMassEditRow,
    getRowsSelectedForMassEdit,
    getImagingSessions,
    getAllPlates,
    getWellIdToWellMap,
  ],
  (
    massEditRow,
    rowsSelectedForMassEdit,
    imagingSessions,
    plates,
    wellIdToWellLabelMap
  ): MassEditRow => ({
    ...(massEditRow && massEditRow),
    [ROW_COUNT_COLUMN]: rowsSelectedForMassEdit?.length,
    wellLabels: (massEditRow?.[WELL_ANNOTATION_NAME] || []).map((id: number) =>
      getWellLabelAndImagingSessionName(
        id,
        imagingSessions,
        plates,
        wellIdToWellLabelMap
      )
    ),
  })
);
