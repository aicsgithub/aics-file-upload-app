import { StateWithHistory } from "redux-undo";

import { NOTES_ANNOTATION_NAME, WELL_ANNOTATION_NAME } from "../../constants";
import { GridCell } from "../../entities";
import {
  AddMetadataServiceFields,
  UploadServiceFields,
} from "../../services/file-management-system/util";
import { JSSJob, JSSJobStatus } from "../../services/job-status-client/types";
import {
  Annotation,
  AnnotationLookup,
  AnnotationOption,
  AnnotationType,
  Channel,
  ColumnType,
  LabkeyChannel,
  Lookup,
  Unit,
  ImagingSession,
  BarcodePrefix,
} from "../../services/labkey-client/types";
import {
  CellPopulation,
  Template,
  TemplateAnnotation,
} from "../../services/mms-client/types";
import {
  feedback,
  job,
  metadata,
  route,
  selection,
  setting,
  template,
  upload,
} from "../index";
import { Well } from "../selection/types";
import {
  AnnotationDraft,
  ImagingSessionIdToPlateMap,
  ImagingSessionIdToWellsMap,
  JobStateBranch,
  SelectionStateBranch,
  State,
  TemplateDraft,
  TemplateStateBranch,
} from "../types";
import { UploadStateBranch } from "../types";
import { getUploadRowKey } from "../upload/constants";

export const mockAuditInfo = {
  created: new Date(2019, 9, 30),
  createdBy: 1,
  modified: new Date(2019, 9, 30),
  modifiedBy: 1,
};

export const mockFavoriteColorAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 1,
  annotationTypeId: 1,
  description: "a description",
  name: "Favorite Color",
  exposeToFileUploadApp: true,
};

export const mockFavoriteColorTemplateAnnotation: TemplateAnnotation = {
  ...mockFavoriteColorAnnotation,
  required: true,
};

const mockIntervalAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 101,
  annotationTypeId: 8,
  description: "Example duration annotation",
  name: "Interval",
  exposeToFileUploadApp: true,
};

export const mockWellAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 2,
  annotationTypeId: 6,
  description: "Well associated with this file",
  exposeToFileUploadApp: true,
  name: WELL_ANNOTATION_NAME,
};

export const mockNotesAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 3,
  annotationTypeId: 1,
  description: "Other information",
  exposeToFileUploadApp: true,
  name: NOTES_ANNOTATION_NAME,
};

const mockUnusableStructureAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 3,
  annotationTypeId: 1,
  description: "Other information",
  exposeToFileUploadApp: false,
  name: "Structure",
};

export const mockMMSTemplate: Template = {
  ...mockAuditInfo,
  annotations: [mockFavoriteColorTemplateAnnotation],
  name: "Test",
  templateId: 1,
  version: 1,
};

export const mockIntervalTemplate: Template = {
  ...mockAuditInfo,
  annotations: [{ ...mockIntervalAnnotation, required: true }],
  name: "Test for Interval",
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
  mockIntervalAnnotation,
  mockWellAnnotation,
  mockNotesAnnotation,
  mockUnusableStructureAnnotation,
];

export const mockLookupOptions = ["option1", "option2", "option3"];

export const getMockStateWithHistory = <T>(state: T): StateWithHistory<T> => {
  return {
    _latestUnfiltered: { ...state },
    future: [],
    group: {},
    index: 0,
    limit: 10,
    past: [],
    present: { ...state },
  };
};

const mockCellPopulation: CellPopulation = {
  seedingDensity: "1000",
  sourceVial: { barcode: "abc" },
};

export const mockWell: Well = {
  cellPopulations: [mockCellPopulation],
  col: 0,
  plateId: 1,
  row: 0,
  solutions: [],
  wellId: 1,
};

export const mockWells: ImagingSessionIdToWellsMap = {
  0: [
    mockWell,
    { ...mockWell, col: 1, row: 0, wellId: 2 },
    { ...mockWell, cellPopulations: [], col: 2, row: 0, wellId: 5 },
    { ...mockWell, col: 1, row: 1, wellId: 4 },
    { ...mockWell, col: 0, row: 1, wellId: 3 },
    { ...mockWell, cellPopulations: [], col: 2, row: 1, wellId: 6 },
  ],
  1: [{ ...mockWell, plateId: 2, wellId: 10 }],
};

export const mockPlate: ImagingSessionIdToPlateMap = {
  0: {
    ...mockAuditInfo,
    barcode: "abc",
    comments: "",
    imagingSessionId: undefined,
    plateGeometryId: 1,
    plateId: 1,
    plateStatusId: 1,
    seededOn: undefined,
  },
  1: {
    ...mockAuditInfo,
    barcode: "abc",
    comments: "drugs added",
    imagingSessionId: 1,
    plateGeometryId: 1,
    plateId: 2,
    plateStatusId: 1,
    seededOn: undefined,
  },
};

export const mockSelection: SelectionStateBranch = {
  barcode: undefined,
  imagingSessionId: undefined,
  imagingSessionIds: [null, 1],
  hasNoPlateToUpload: false,
  plate: mockPlate,
  selectedWells: [],
  user: "fake_user",
  wells: mockWells,
};

export const mockWellUpload: UploadStateBranch = {
  [getUploadRowKey({ file: "/path/to/file1" })]: {
    barcode: "1234",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file1",
    key: getUploadRowKey({ file: "/path/to/file1" }),
    [WELL_ANNOTATION_NAME]: [1],
  },
  [getUploadRowKey({ file: "/path/to/file2" })]: {
    barcode: "1235",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file2",
    key: getUploadRowKey({ file: "/path/to/file2" }),
    [WELL_ANNOTATION_NAME]: [2],
  },
  [getUploadRowKey({ file: "/path/to/file3" })]: {
    barcode: "1236",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file3",
    key: getUploadRowKey({ file: "/path/to/file3" }),
    [WELL_ANNOTATION_NAME]: [1, 2, 3],
  },
  [getUploadRowKey({ file: "/path/to/file3", positionIndex: 1 })]: {
    barcode: "1236",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file3",
    key: getUploadRowKey({ file: "/path/to/file3", positionIndex: 1 }),
    positionIndex: 1,
    [WELL_ANNOTATION_NAME]: [1, 2],
  },
};

export const mockTextAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 56,
  annotationTypeId: 1,
  description: "some description",
  lookupSchema: undefined,
  lookupTable: undefined,
  name: "Another Garbage Text Annotation",
  required: false,
};

export const mockDateAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 68,
  annotationTypeId: 7,
  description: "dob - for testing",
  lookupSchema: undefined,
  lookupTable: undefined,
  name: "Birth Date",
  required: false,
};

export const mockDateTimeAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 70,
  annotationTypeId: 4,
  description: "",
  lookupSchema: undefined,
  lookupTable: undefined,
  name: "Seeded On",
  required: false,
};

export const mockNumberAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 64,
  annotationTypeId: 2,
  description: "for testing number annotations",
  lookupSchema: undefined,
  lookupTable: undefined,
  name: "Clone Number Garbage",
  required: false,
};

export const mockLookupAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 2,
  annotationOptions: ["spCas9", "Not Recorded"],
  annotationTypeId: 6,
  description: "CRISPR associated protein 9",
  lookupSchema: "celllines",
  lookupTable: "cas9",
  name: "Cas9",
  required: false,
};

export const mockDropdownAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 69,
  annotationOptions: ["A", "B", "C", "D"],
  annotationTypeId: 5,
  description: "test",
  lookupSchema: undefined,
  lookupTable: undefined,
  name: "Dropdown",
  required: false,
};

export const mockBooleanAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 61,
  annotationTypeId: 3,
  description: "Is this image related to QC of a gene-edited line?",
  lookupSchema: undefined,
  lookupTable: undefined,
  name: "Qc",
  required: false,
};

export const mockTemplateWithManyValues: Template = {
  ...mockAuditInfo,
  annotations: [
    mockTextAnnotation,
    mockDateAnnotation,
    mockDateTimeAnnotation,
    mockLookupAnnotation,
    mockNumberAnnotation,
    mockBooleanAnnotation,
    mockDropdownAnnotation,
    {
      ...mockAuditInfo,
      annotationId: 21,
      annotationTypeId: 6,
      description:
        "A well on a plate (that has been entered into the Plate UI)",
      name: "Well Ids",
      required: false,
    },
    {
      ...mockAuditInfo,
      annotationId: 22,
      annotationTypeId: 1,
      description:
        "Additional information that doesn't align well with other annotations",
      name: NOTES_ANNOTATION_NAME,
      required: true,
    },
  ],
  name: "Test multiple values",
  templateId: 8,
  version: 1,
};

export const mockState: State = {
  feedback: feedback.initialState,
  job: job.initialState,
  metadata: metadata.initialState,
  route: route.initialState,
  selection: getMockStateWithHistory(selection.initialState),
  setting: setting.initialState,
  template: template.initialState,
  upload: getMockStateWithHistory(upload.initialState),
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

export const mockSelectedWells: GridCell[] = [
  new GridCell(0, 0),
  new GridCell(0, 1),
  new GridCell(1, 0),
  new GridCell(1, 1),
];

export const mockSuccessfulUploadJob: JSSJob = {
  created: new Date(),
  currentStage: "Completed",
  jobId: "123434234",
  jobName: "mockJob1",
  modified: new Date(),
  serviceFields: {
    copyJobId: "copyJobId1",
    result: [{ fileId: "cat" }, { fileId: "dog" }],
    type: "upload",
  },
  status: JSSJobStatus.SUCCEEDED,
  user: "test_user",
};

export const mockWorkingUploadJob: JSSJob<UploadServiceFields> = {
  created: new Date(),
  currentStage: "Copying files",
  jobId: "2222222222",
  jobName: "mockWorkingUploadJob",
  modified: new Date(),
  serviceFields: {
    files: [],
    lastModified: {},
    md5: {},
    type: "upload",
    uploadDirectory: "/tmp/fss/asdf",
  },
  status: JSSJobStatus.WORKING,
  user: "test_user",
};

export const mockWaitingUploadJob: JSSJob = {
  ...mockWorkingUploadJob,
  status: JSSJobStatus.WAITING,
};

export const mockFailedUploadJob: JSSJob<UploadServiceFields> = {
  created: new Date(),
  currentStage: "Copy error",
  jobId: "3333333333",
  jobName: "mockFailedUploadJob",
  modified: new Date(),
  serviceFields: {
    files: [
      {
        customMetadata: {
          annotations: [
            {
              annotationId: 1,
              values: ["test", "1"],
              channelId: "Raw 405nm",
            },
          ],
          templateId: 1,
        },
        file: {
          originalPath: "/some/filepath",
          fileType: "other",
          shouldBeInArchive: true,
          shouldBeInLocal: true,
        },
      },
    ],
    lastModified: {},
    md5: {},
    type: "upload",
    uploadDirectory: "/foo",
  },
  status: JSSJobStatus.FAILED,
  user: "test_user",
};

const mockAddMetadataJob: JSSJob<AddMetadataServiceFields> = {
  created: new Date(),
  currentStage: "Complete",
  jobId: "addMetadataJobId",
  jobName: "Add Metadata job 1",
  modified: new Date(),
  serviceFields: {
    type: "add_metadata",
  },
  status: JSSJobStatus.WAITING,
  user: "test_user",
};

export const mockSuccessfulAddMetadataJob: JSSJob = {
  ...mockAddMetadataJob,
  jobId: "addMetadataJobId2",
  parentId: "123434234",
  status: JSSJobStatus.SUCCEEDED,
};

export const mockWorkingAddMetadataJob: JSSJob = {
  ...mockAddMetadataJob,
  jobId: "addMetadataJobId3",
  parentId: "2222222222",
  status: JSSJobStatus.WORKING,
};

export const mockFailedAddMetadataJob: JSSJob = {
  ...mockAddMetadataJob,
  jobId: "addMetadataJobId4",
  parentId: "3333333333",
  status: JSSJobStatus.FAILED,
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
  {
    annotationTypeId: 8,
    name: ColumnType.DURATION,
  },
];

export const nonEmptyJobStateBranch: JobStateBranch = {
  ...mockState.job,
  uploadJobs: [
    mockSuccessfulUploadJob,
    mockWorkingUploadJob,
    mockFailedUploadJob,
  ],
};

export const mockAnnotationDraft: AnnotationDraft = {
  annotationId: 1,
  annotationTypeId: 1,
  annotationTypeName: "Text",
  description: "You know what a color is",
  index: 0,
  name: "Color",
  required: false,
  ...mockAuditInfo,
};

export const mockTemplateDraft: TemplateDraft = {
  annotations: [mockAnnotationDraft],
  name: "My Template",
  version: 1,
};

export const mockAnnotationLookups: AnnotationLookup[] = [
  {
    annotationId: mockWellAnnotation.annotationId,
    lookupId: 1,
  },
];

export const mockAnnotationOptions: AnnotationOption[] = [
  {
    annotationId: 1,
    annotationOptionId: 1,
    value: "Green",
  },
];

export const mockImagingSessions: ImagingSession[] = [
  {
    description: "",
    imagingSessionId: 1,
    name: "1 Week",
  },
  {
    description: "",
    imagingSessionId: 2,
    name: "2 Weeks",
  },
];

export const mockBarcodePrefixes: BarcodePrefix[] = [
  {
    description: "Assay Dev",
    prefix: "AD",
    prefixId: 1,
  },
  {
    description: "Microscopy",
    prefix: "MI",
    prefixId: 2,
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
  channelId: "Raw 468 nm",
  description: "a channel",
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
    annotationLookups: mockAnnotationLookups,
    annotationOptions: mockAnnotationOptions,
    annotationTypes: mockAnnotationTypes,
    annotations: mockAnnotations,
    currentUpload: {
      created: new Date(),
      modified: new Date(),
      name: "foo",
    },
    lookups: mockLookups,
  },
  selection: getMockStateWithHistory({
    ...mockSelection,
    barcode: "1234",
    selectedWells: [{ col: 0, row: 0 }],
  }),
  template: {
    ...mockTemplateStateBranch,
    appliedTemplate: mockMMSTemplate,
  },
  upload: getMockStateWithHistory(mockWellUpload),
};
