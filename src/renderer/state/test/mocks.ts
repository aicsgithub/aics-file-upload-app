import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { StateWithHistory } from "redux-undo";
import { LabkeyImagingSession } from "../../util/labkey-client";
import { JobStateBranch } from "../job/types";

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
    well: undefined,
    wells: [],
};

export const mockState: State = {
    feedback: {
        events: [],
        isLoading: false,
        requestsInProgress: [],
    },
    job: {
        uploadJobs: [],
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
            wellId: 1,
            wellLabel: "A1",
        },
        "/path/to/file2": {
            barcode: "1235",
            wellId: 2,
            wellLabel: "A2",
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

export const mockJob: JSSJob = {
    created: new Date(),
    currentStage: "Completed",
    jobId: "123434234",
    jobName: "mockJob1",
    modified: new Date(),
    status: "SUCCEEDED",
    user: "test_user",
};

export const mockJob2: JSSJob = {
    created: new Date(),
    currentStage: "Copying files",
    jobId: "2222222222",
    jobName: "mockJob2",
    modified: new Date(),
    status: "SUCCEEDED",
    user: "test_user",
};

export const mockJob3: JSSJob = {
    created: new Date(),
    currentStage: "Copy error",
    jobId: "3333333333",
    jobName: "mockJob3",
    modified: new Date(),
    status: "FAILED",
    user: "test_user",
};

export const nonEmptyJobStateBranch: JobStateBranch = {
    ...mockState.job,
    uploadJobs: [mockJob, mockJob2, mockJob3],
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
