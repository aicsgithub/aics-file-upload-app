import { StateWithHistory } from "redux-undo";

import { Unit } from "../metadata/types";
import { GetViabilityResultResponse, Page, SelectionStateBranch, Well } from "../selection/types";
import { State } from "../types";

export const getMockStateWithHistory = <T>(state: T): StateWithHistory<T> => {
    return {
        _latestUnfiltered: {...state},
        future: [],
        group: {},
        index: 0,
        limit: 10,
        past: [],
        present: {...state},
    };
};

export const mockSelection: SelectionStateBranch = {
    files: [],
    page: Page.DragAndDrop,
    stagedFiles: [],
    viabilityResults: [],
    well: undefined,
    wells: [],
};

export const mockState: State = {
    feedback: {
        events: [],
        isLoading: false,
        requestsInProgress: [],
    },
    metadata: {
        history: {
            selection: {},
            upload: {},
        },
        units: [],
    },
    selection: getMockStateWithHistory(mockSelection),
    upload: getMockStateWithHistory({}),
};

export const mockUnits: Unit[] = [
    {
        description: "",
        name: "unit1",
        type: "volume",
        unitsId: 1,
    },
    {
        description: "",
        name: "unit2",
        type: "volume",
        unitsId: 2,
    },
    {
        description: "",
        name: "unit3",
        type: "mass",
        unitsId: 3,
    },
    {
        description: "",
        name: "unit4",
        type: "mass",
        unitsId: 4,
    },
];

export const mockWell: Well = {
    cellPopulations: [],
    col: 0,
    row: 0,
    solutions: [],
    viabilityResults: [],
    wellId: 1,
};

export const mockWells: Well[] = [
    mockWell,
    {...mockWell, col: 1, row: 0, wellId: 2},
    {...mockWell, col: 0, row: 1, wellId: 3},
    {...mockWell, col: 1, row: 1, wellId: 4},
];

export const mockViabilityResult: GetViabilityResultResponse = {
    col: 0,
    row: 0,
    suspensionVolume: "1000",
    suspensionVolumeUnitId: 3,
    viability: 91.9,
    viableCellCountPerUnit: 88,
    viableCellCountUnitId: 4,
    wellId: 100,
    wellViabilityResultId: 1,
};
