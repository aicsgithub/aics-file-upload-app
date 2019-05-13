import { StateWithHistory } from "redux-undo";

import { Unit } from "../metadata/types";
import { Page, SelectionStateBranch, Well } from "../selection/types";
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
    col: 1,
    row: 1,
    solutions: [],
    viabilityResults: [],
    wellId: 1,
};

export const mockWells: Well[][] = [
    [mockWell, {...mockWell, wellId: 2}],
    [{...mockWell, wellId: 3}, {...mockWell, wellId: 4}],
];
