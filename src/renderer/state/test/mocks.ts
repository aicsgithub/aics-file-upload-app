import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { StateWithHistory } from "redux-undo";
import { LabkeyChannel, LabkeyImagingSession, LabKeyPlateBarcodePrefix } from "../../util/labkey-client/types";
import { JobStateBranch, PendingJob } from "../job/types";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import { Channel, Unit } from "../metadata/types";
import {
    Page,
    SelectionStateBranch,
    Well,
    Workflow
} from "../selection/types";
import {
    Annotation,
    AnnotationDraft,
    AnnotationLookup,
    AnnotationType,
    ColumnType,
    Lookup,
    Template,
    TemplateAnnotation,
    TemplateDraft,
    TemplateStateBranch,
} from "../template/types";
import { State } from "../types";
import { getUploadRowKey } from "../upload/constants";
import { getUploadPayload } from "../upload/selectors";
import { UploadStateBranch } from "../upload/types";

export const mockAuditInfo = {
    created: new Date(2019, 9, 30),
    createdBy: 1,
    modified: new Date(2019, 9, 30),
    modifiedBy: 1,
};

export const mockFavoriteColorAnnotation: TemplateAnnotation = {
    ...mockAuditInfo,
    annotationId: 1,
    annotationOptions: undefined,
    annotationTypeId: 1,
    canHaveManyValues: false,
    description: "a description",
    name: "Favorite Color",
    required: true,
};

export const mockWellAnnotation: Annotation = {
    ...mockAuditInfo,
    annotationId: 2,
    annotationTypeId: 3,
    description: "Well associated with this file",
    name: "Well",
};

export const mockWorkflowAnnotation: Annotation = {
    ...mockAuditInfo,
    annotationId: 4,
    annotationTypeId: 3,
    description: "Workflow associated with this file",
    name: "Workflow",
};

export const mockNotesAnnotation: Annotation = {
    ...mockAuditInfo,
    annotationId: 3,
    annotationTypeId: 1,
    description: "Other information",
    name: "Notes",
};

export const mockMMSTemplate: Template = {
    ...mockAuditInfo,
    annotations: [mockFavoriteColorAnnotation],
    name: "Test",
    templateId: 1,
    version: 1,
};

export const mockTemplateStateBranch: TemplateStateBranch = {
    appliedTemplate: undefined,
    draft: {
        annotations: [],
    },
};

export const mockTemplateStateBranchWithAppliedTemplate: TemplateStateBranch = {
    ...mockTemplateStateBranch,
    appliedTemplate: mockMMSTemplate,
};

export const mockAnnotations = [
    mockFavoriteColorAnnotation,
    mockWellAnnotation,
    mockWorkflowAnnotation,
    mockNotesAnnotation,
];

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
    expandedUploadJobRows: {},
    files: [],
    imagingSessionId: undefined,
    imagingSessionIds: [],
    openTemplateModalVisible: false,
    page: Page.DragAndDrop,
    selectedWells: [],
    selectedWorkflows: [],
    stagedFiles: [],
    templateEditorVisible: false,
    view: Page.DragAndDrop,
    wells: [],
};

export const mockWellUpload: UploadStateBranch = {
    [getUploadRowKey("/path/to/file1")]: {
        barcode: "1234",
        file: "/path/to/file1",
        wellIds: [1],
        wellLabels: ["A1"],
    },
    [getUploadRowKey("/path/to/file2")]: {
        barcode: "1235",
        file: "/path/to/file2",
        wellIds: [2],
        wellLabels: ["A2"],
    },
    [getUploadRowKey("/path/to/file3")]: {
        barcode: "1236",
        file: "/path/to/file3",
        wellIds: [1, 2, 3],
        wellLabels: ["A1", "A2", "B1"],
    },
};

export const mockState: State = {
    feedback: {
        events: [],
        isLoading: false,
        requestsInProgress: [],
    },
    job: {
        copyJobs: [],
        pendingJobs: [],
        uploadJobs: [],
    },
    metadata: {
        annotationLookups: [],
        annotationTypes: [],
        annotations: [],
        barcodePrefixes: [],
        barcodeSearchResults: [],
        channels: [],
        history: {
            selection: {},
            upload: {},
        },
        imagingSessions: [],
        lookups: [],
        templates: [],
        units: [],
        workflowOptions: [],
    },
    selection: getMockStateWithHistory(mockSelection),
    setting: {
        associateByWorkflow: false,
        limsHost: "localhost",
        limsPort: "8080",
        limsProtocol: "http",
        templateIds: [],
    },
    template: getMockStateWithHistory(mockTemplateStateBranch),
    upload: getMockStateWithHistory(mockWellUpload),
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

export const mockSelectedWells: GridCell[] = [
    new GridCell(0, 0),
    new GridCell(0, 1),
    new GridCell(1, 0),
    new GridCell(1, 1),
];

export const mockSelectedWorkflows: Workflow[] = [
    { workflowId: 1, name: "name1", description: "cool workflow"},
    { workflowId: 2, name: "name2", description: "cool workflow"},
    { workflowId: 3, name: "name3", description: "cool workflow"},
    { workflowId: 4, name: "name4", description: "cool workflow"},
];

export const mockSuccessfulUploadJob: JSSJob = {
    created: new Date(),
    currentStage: "Completed",
    jobId: "123434234",
    jobName: "mockJob1",
    modified: new Date(),
    serviceFields: {
        copyJobId: "copyJobId1",
    },
    status: "SUCCEEDED",
    user: "test_user",
};

export const mockUnrecoverableUploadJob: JSSJob = {
    ...mockSuccessfulUploadJob,
    status: "UNRECOVERABLE",
};

export const mockWorkingUploadJob: JSSJob = {
    created: new Date(),
    currentStage: "Copying files",
    jobId: "2222222222",
    jobName: "mockWorkingUploadJob",
    modified: new Date(),
    serviceFields: {
        copyJobId: "copyJobId2",
    },
    status: "WORKING",
    user: "test_user",
};

export const mockRetryingUploadJob: JSSJob = {
    ...mockWorkingUploadJob,
    status: "RETRYING",
};

export const mockWaitingUploadJob: JSSJob = {
    ...mockWorkingUploadJob,
    status: "WAITING",
};

export const mockBlockedUploadJob: JSSJob = {
    ...mockWorkingUploadJob,
    status: "BLOCKED",
};

export const mockFailedUploadJob: JSSJob = {
    created: new Date(),
    currentStage: "Copy error",
    jobId: "3333333333",
    jobName: "mockFailedUploadJob",
    modified: new Date(),
    status: "FAILED",
    user: "test_user",
};

export const mockSuccessfulCopyJob: JSSJob = {
    created: new Date(),
    currentStage: "Complete",
    jobId: "copyJobId1",
    jobName: "Copy job parent for 123434234",
    modified: new Date(),
    status: "SUCCEEDED",
    user: "test_user",
};

export const mockWorkingCopyJob: JSSJob = {
    ...mockSuccessfulCopyJob,
    currentStage: "Copying files",
    jobId: "copyJobId2",
    jobName: "Copy job parent for 2222222222",
    status: "WORKING",
};

export const mockFailedCopyJob: JSSJob = {
    ...mockSuccessfulCopyJob,
    currentStage: "Invalid permissions",
    jobId: "copyJobId3",
    jobName: "Copy job parent for 3333333333",
    status: "FAILED",
};

export const mockPendingJob: PendingJob = {
    ...mockWorkingUploadJob,
    uploads: getUploadPayload({
        ...mockState,
        metadata: {
            ...mockState.metadata,
            annotations: [mockWellAnnotation, mockWorkflowAnnotation, mockNotesAnnotation],
        },
        template: getMockStateWithHistory(mockTemplateStateBranchWithAppliedTemplate),
    }),
};

export const nonEmptyJobStateBranch: JobStateBranch = {
    ...mockState.job,
    copyJobs: [mockFailedCopyJob, mockSuccessfulCopyJob, mockWorkingCopyJob],
    pendingJobs: [mockPendingJob],
    uploadJobs: [mockSuccessfulUploadJob, mockWorkingUploadJob, mockFailedUploadJob],
};

export const mockAnnotationDraft: AnnotationDraft = {
    annotationId: 1,
    annotationTypeId: 1,
    annotationTypeName: "Text",
    canHaveManyValues: false,
    description: "You know what a color is",
    index: 0,
    name: "Color",
    required: false,
};

export const mockTemplateDraft: TemplateDraft = {
    annotations: [mockAnnotationDraft],
    name: "My Template",
};

export const mockAnnotationLookups: AnnotationLookup[] = [
    {
        annotationId: 1,
        lookupId: 1,
    },
];

export const mockAnnotationTypes: AnnotationType[] = [
    {
        annotationTypeId: 1,
        name: ColumnType.TEXT,
    },
    {
        annotationTypeId: 2,
        name: ColumnType.BOOLEAN,
    },
    {
        annotationTypeId: 3,
        name: ColumnType.LOOKUP,
    },
    {
        annotationTypeId: 4,
        name: ColumnType.DROPDOWN,
    },
];

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

export const mockBarcodePrefixes: LabKeyPlateBarcodePrefix[] = [
    {
        PlateBarcodePrefixId: 1,
        Prefix: "AX",
        TeamName: "Assay Dev",
    },
    {
        PlateBarcodePrefixId: 2,
        Prefix: "MX",
        TeamName: "Microscopy",
    },
];

export const mockChannels: LabkeyChannel[] = [
    {
        ContentTypeId: 1,
        Description: "a channel",
        Name: "Raw 468nm",
    },
];

export const mockChannel: Channel = {
    channelId: 1,
    description: "a channel",
    name: "Raw 468 nm",
};

export const mockUnit: Unit = {
    description: "description",
    name: "name",
    type: "type",
    unitsId: 1,
};

export const mockLookups: Lookup[] = [
    {
        ...mockAuditInfo,
        columnName: "columnname",
        descriptionColumn: "description",
        lookupId: 1,
        schemaName: "schema",
        tableName: "tablename",
    },
];

export const nonEmptyStateForInitiatingUpload: State = {
    ...mockState,
    metadata: {
        ...mockState.metadata,
        annotationTypes: mockAnnotationTypes,
        annotations: mockAnnotations,
    },
    template: getMockStateWithHistory({
        ...mockTemplateStateBranch,
        appliedTemplate: mockMMSTemplate,
    }),
    upload: getMockStateWithHistory(mockWellUpload),
};
