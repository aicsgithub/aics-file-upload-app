import { TableInfo } from "@aics/aicsfiles/type-declarations/types";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { StateWithHistory } from "redux-undo";
import { LabkeyChannel, LabkeyImagingSession, LabKeyPlateBarcodePrefix } from "../../util/labkey-client/types";
import { JobStateBranch, PendingJob } from "../job/types";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import { Channel, SearchResultsTable, Unit } from "../metadata/types";
import { Page } from "../route/types";
import {
    SelectionStateBranch,
    Well,
    Workflow
} from "../selection/types";
import {
    Annotation,
    AnnotationDraft,
    AnnotationLookup,
    AnnotationOption,
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

export const mockLookupOptions = [
    "option1",
    "option2",
    "option3",
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
    annotation: "Dataset",
    barcode: undefined,
    expandedUploadJobRows: {},
    files: [],
    imagingSessionId: undefined,
    imagingSessionIds: [],
    openTemplateModalVisible: false,
    selectedWells: [],
    selectedWorkflows: [],
    settingsEditorVisible: false,
    stagedFiles: [],
    templateEditorVisible: false,
    wells: [],
};

export const mockWellUpload: UploadStateBranch = {
    [getUploadRowKey("/path/to/file1")]: {
        barcode: "1234",
        file: "/path/to/file1",
        key: getUploadRowKey("/path/to/file"),
        shouldBeInArchive: true,
        shouldBeInLocal: true,
        wellIds: [1],
        wellLabels: ["A1"],
    },
    [getUploadRowKey("/path/to/file2")]: {
        barcode: "1235",
        file: "/path/to/file2",
        key: getUploadRowKey("/path/to/file2"),
        shouldBeInArchive: false,
        shouldBeInLocal: true,
        wellIds: [2],
        wellLabels: ["A2"],
    },
    [getUploadRowKey("/path/to/file3")]: {
        barcode: "1236",
        file: "/path/to/file3",
        key: getUploadRowKey("/path/to/file3"),
        shouldBeInArchive: true,
        shouldBeInLocal: false,
        wellIds: [1, 2, 3],
        wellLabels: ["A1", "A2", "B1"],
    },
};

export const mockTextAnnotation: TemplateAnnotation = {
    ...mockAuditInfo,
    annotationId: 56,
    annotationTypeId: 1,
    canHaveManyValues: true,
    description: "some description",
    lookupSchema: undefined,
    lookupTable: undefined,
    name: "Another Garbage Text Annotation",
    required: false,
};

export const mockDateAnnotation: TemplateAnnotation = {
    ...mockAuditInfo,
    annotationId: 68,
    annotationTypeId: 4,
    canHaveManyValues: true,
    description: "dob - for testing",
    lookupSchema: undefined,
    lookupTable: undefined,
    name: "Birth Date",
    required: false,
};

export const mockNumberAnnotation: TemplateAnnotation = {
    ...mockAuditInfo,
    annotationId: 64,
    annotationTypeId: 2,
    canHaveManyValues: true,
    description: "for testing number annotations",
    lookupSchema: undefined,
    lookupTable: undefined,
    name: "Clone Number Garbage",
    required: false,
};

export const mockTemplateWithManyValues: Template = {
    ...mockAuditInfo,
    annotations: [
        mockTextAnnotation,
        mockDateAnnotation,
        {
            ...mockAuditInfo,
            annotationId: 2,
            annotationOptions: [
                "spCas9",
                "Not Recorded",
            ],
            annotationTypeId: 6,
            canHaveManyValues: true,
            description: "CRISPR associated protein 9",
            lookupSchema: "celllines",
            lookupTable: "cas9",
            name: "Cas9",
            required: false,
        },
        mockNumberAnnotation,
        {
            ...mockAuditInfo,
            annotationId: 61,
            annotationTypeId: 3,
            canHaveManyValues: true,
            description: "Is this image related to QC of a gene-edited line?",
            lookupSchema: undefined,
            lookupTable: undefined,
            name: "Qc",
            required: false,
        },
        {
            ...mockAuditInfo,
            annotationId: 69,
            annotationOptions: [
                "A",
                "B",
                "C",
                "D",
            ],
            annotationTypeId: 5,
            canHaveManyValues: false,
            description: "test",
            lookupSchema: undefined,
            lookupTable: undefined,
            name: "Dropdown",
            required: false,
        },
        {
            ...mockAuditInfo,
            annotationId: 21,
            annotationTypeId: 6,
            canHaveManyValues: true,
            description: "A well on a plate (that has been entered into the Plate UI)",
            name: "Well Ids",
            required: false,
        },
        {
            ...mockAuditInfo,
            annotationId: 18,
            annotationTypeId: 6,
            canHaveManyValues: true,
            description: "Name of pipeline or non-pipeline experimental category (e.g. Pipeline 4, R&DExp, RNA-FISH)",
            name: "Workflows",
            required: false,
        },
        {
            ...mockAuditInfo,
            annotationId: 22,
            annotationTypeId: 1,
            canHaveManyValues: true,
            description: "Additional information that doesn't align well with other annotations",
            name: "Notes",
            required: true,
        },
    ],
    name: "Test multiple values",
    templateId: 8,
    version: 1,
};

export const mockState: State = {
    feedback: {
        events: [],
        isLoading: false,
        requestsInProgress: [],
        setMountPointNotificationVisible: false,
    },
    job: {
        addMetadataJobs: [],
        copyJobs: [],
        pendingJobs: [],
        uploadJobs: [],
    },
    metadata: {
        annotationLookups: [],
        annotationOptions: [],
        annotationTypes: [],
        annotations: [],
        barcodePrefixes: [],
        barcodeSearchResults: [],
        channels: [],
        history: {
            selection: {},
            template: {},
            upload: {},
        },
        imagingSessions: [],
        lookups: [],
        templates: [],
        units: [],
        workflowOptions: [],
    },
    route: {
        page: Page.DragAndDrop,
        view: Page.DragAndDrop,
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

export const mockSearchResults: TableInfo = {
    annotationToColumnMap: {
        FileId: 0,
        PositionIndex: 1,
    },
    imageModelToFileMetadata: {
        "abc123": [["abc123"], []],
        "abc123-1": [["abc123"], [1]],
    },
};

export const mockSearchResultsAsTable: SearchResultsTable = {
    header: [
        {
            dataIndex: "FileId",
            key: "FileId",
            title: "FileId",
        },
        {
            dataIndex: "PositionIndex",
            key: "PositionIndex",
            title: "PositionIndex",
        },
    ],
    rows: [
        {
            FileId: "abc123",
            PositionIndex: "",
            key: "abc123",
        },
        {
            FileId: "abc123",
            PositionIndex: "1",
            key: "abc123-1",
        },
    ],
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

const mockAddMetadataJob: JSSJob = {
    created: new Date(),
    currentStage: "Complete",
    jobId: "addMetadataJobId",
    jobName: "Add Metadata job 1",
    modified: new Date(),
    status: "WAITING",
    user: "test_user",
};

export const mockSuccessfulAddMetadataJob: JSSJob = {
    ...mockAddMetadataJob,
    parentId: "123434234",
    status: "SUCCEEDED",
};

export const mockWorkingAddMetadataJob: JSSJob = {
    ...mockAddMetadataJob,
    parentId: "2222222222",
    status: "WORKING",
};

export const mockFailedAddMetadataJob: JSSJob = {
    ...mockAddMetadataJob,
    parentId: "3333333333",
    status: "FAILED",
};

export const mockAnnotationTypes: AnnotationType[] = [
    {
        annotationTypeId: 1,
        name: ColumnType.TEXT,
    },
    {
        annotationTypeId: 2,
        name: ColumnType.NUMBER,
    },
    {
        annotationTypeId: 3,
        name: ColumnType.BOOLEAN,
    },
    {
        annotationTypeId: 4,
        name: ColumnType.DATETIME,
    },
    {
        annotationTypeId: 5,
        name: ColumnType.DROPDOWN,
    },
    {
        annotationTypeId: 6,
        name: ColumnType.LOOKUP,
    },
    {
        annotationTypeId: 7,
        name: ColumnType.DATE,
    },
];

export const mockPendingJob: PendingJob = {
    ...mockWorkingUploadJob,
    uploads: getUploadPayload({
        ...mockState,
        metadata: {
            ...mockState.metadata,
            annotationTypes: mockAnnotationTypes,
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
    version: 1,
};

export const mockAnnotationLookups: AnnotationLookup[] = [
    {
        annotationId: 1,
        lookupId: 1,
    },
    {
        annotationId: 2,
        lookupId: 2,
    },
];

export const mockAnnotationOptions: AnnotationOption[] = [
    {
        annotationId: 1,
        annotationOptionId: 1,
        value: "Green",
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
        annotationOptions: mockAnnotationOptions,
        annotationTypes: mockAnnotationTypes,
        annotations: mockAnnotations,
    },
    template: getMockStateWithHistory({
        ...mockTemplateStateBranch,
        appliedTemplate: mockMMSTemplate,
    }),
    upload: getMockStateWithHistory(mockWellUpload),
};
