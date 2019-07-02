import { StateWithHistory } from "redux-undo";
import { LabkeyImagingSession } from "../../util/labkey-client";
import { Job, JobStateBranch, JobStatus } from "../job/types";

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
    barcode: undefined,
    files: [],
    imagingSessionId: undefined,
    imagingSessionIds: [],
    page: Page.DragAndDrop,
    stagedFiles: [],
    selectedWells: [],
    wells: [],
};

export const mockState: State = {
    feedback: {
        events: [],
        isLoading: false,
        requestsInProgress: [],
    },
    job: {
        jobs: [],
    },
    metadata: {
        history: {
            selection: {},
            upload: {},
        },
        imagingSessions: [],
        units: [],
    },
    selection: getMockStateWithHistory(mockSelection),
    setting: {
        limsHost: "localhost",
        limsPort: "8080",
        limsProtocol: "http",
    },
    upload: getMockStateWithHistory({
        "/path/to/file1": {
            barcode: "1234",
            wellIds: [1],
            wellLabels: ["A1"],
        },
        "/path/to/file2": {
            barcode: "1235",
            wellIds: [2],
            wellLabels: ["A2"],
        },
    }),
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
    wellId: 1,
};

export const mockWells: Well[] = [
    {...mockWell, col: 1, row: 0, wellId: 2},
    mockWell,
    {...mockWell, col: 1, row: 1, wellId: 4},
    {...mockWell, col: 0, row: 1, wellId: 3},
];

export const mockJob: Job = {
    copyComplete: true,
    created: new Date(),
    jobId: "123434234",
    name: "mockJob1",
    stage: "Completed",
    status: JobStatus.COMPLETE,
};

export const mockJob2: Job = {
    copyComplete: true,
    created: new Date(),
    jobId: "2222222222",
    name: "mockJob2",
    stage: "Copying files",
    status: JobStatus.COMPLETE,
};

export const mockJob3: Job = {
    copyComplete: false,
    created: new Date(),
    jobId: "3333333333",
    name: "mockJob3",
    stage: "Copy error",
    status: JobStatus.FAILED,
};

export const nonEmptyJobStateBranch: JobStateBranch = {
    ...mockState.job,
    jobs: [mockJob, mockJob2, mockJob3],
};

export const mockImagingSessions: LabkeyImagingSession[] = [
    {
        Description: "",
        ImagingSessionId: 1,
        Name: "1 Week",
    },
    {
        Description: "",
        ImagingSessionId: 2,
        Name: "2 Weeks",
    },
];
