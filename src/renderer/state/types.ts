import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Menu, MessageBoxOptions, OpenDialogOptions } from "electron";
import { AnyAction } from "redux";
import { CreateLogic } from "redux-logic/definitions/logic";
import { StateWithHistory } from "redux-undo";

import { WELL_ANNOTATION_NAME, WORKFLOW_ANNOTATION_NAME } from "../constants";
import { LocalStorage, MMSClient } from "../services";
import LabkeyClient from "../services/labkey-client";
import {
  Annotation,
  AnnotationLookup,
  AnnotationOption,
  AnnotationType,
  BarcodePrefix,
  Channel,
  ImagingSession,
  LabkeyPlateResponse,
  LabkeyTemplate,
  LabkeyUser,
  Lookup,
  Unit,
  Workflow,
} from "../services/labkey-client/types";
import { Template } from "../services/mms-client/types";

import { SelectionStateBranch } from "./selection/types";
import { SettingStateBranch } from "./setting/types";
import Process = CreateLogic.Config.Process;
import DepObj = CreateLogic.Config.DepObj;
import SaveDialogOptions = Electron.SaveDialogOptions;

export interface ActionDescription {
  accepts: (action: AnyAction) => boolean;
  perform: (state: any, action: any) => any;
}

export interface BatchedAction {
  type: string;
  batch: boolean;
  payload: AnyAction[];
}

export interface Logger {
  debug: (...x: any[]) => void;
  error: (...x: any[]) => void;
  info: (...x: any[]) => void;
  warn: (...x: any[]) => void;
}

export interface Dialog {
  showOpenDialog(
    options: OpenDialogOptions
  ): Promise<Electron.OpenDialogReturnValue>;
  showMessageBox(
    options: MessageBoxOptions
  ): Promise<Electron.MessageBoxReturnValue>;
  showSaveDialog(
    options: SaveDialogOptions
  ): Promise<Electron.SaveDialogReturnValue>;
}

export interface ReduxLogicExtraDependencies {
  ctx?: any;
  dialog: Dialog;
  fms: FileManagementSystem;
  getApplicationMenu: () => Menu | null;
  ipcRenderer: {
    on: (channel: string, listener: (...args: any[]) => void) => void;
    send: (channel: string, ...args: any[]) => void;
  };
  jssClient: JobStatusClient;
  labkeyClient: LabkeyClient;
  logger: Logger;
  mmsClient: MMSClient;
  readFile: (filePath: string, encoding?: string) => Promise<string | Buffer>;
  storage: LocalStorage;
  writeFile: (filePath: string, content: string | Buffer) => Promise<void>;
}

export type ReduxLogicProcessDependencies = Process.DepObj<
  State,
  AnyAction,
  ReduxLogicExtraDependencies,
  undefined
>;
export type ReduxLogicProcessDependenciesWithAction<
  Action extends AnyAction
> = Process.DepObj<State, Action, ReduxLogicExtraDependencies>;
export type ReduxLogicTransformDependencies = DepObj<
  State,
  AnyAction,
  ReduxLogicExtraDependencies
>;
export type ReduxLogicTransformDependenciesWithAction<Action> = DepObj<
  State,
  Action,
  ReduxLogicExtraDependencies
>;

export type ReduxLogicNextCb = (action: AnyAction) => void;
export type ReduxLogicRejectCb = (action: AnyAction) => void;
export type ReduxLogicDoneCb = () => void;

export interface AppAlert {
  manualClear?: boolean;
  message?: string;
  statusCode?: number;
  type: AlertType;
}

export interface AppEvent {
  message: string;
  date: Date;
  type: AlertType;
}

export enum AlertType {
  WARN = 1,
  SUCCESS,
  ERROR,
  INFO,
}

export enum AsyncRequest {
  CANCEL_UPLOAD = "CANCEL_UPLOAD",
  EXPORT_FILE_METADATA = "EXPORT_FILE_METADATA",
  GET_ANNOTATIONS = "GET_ANNOTATIONS",
  GET_BARCODE_SEARCH_RESULTS = "GET_BARCODE_SEARCH_RESULTS",
  GET_PLATE = "GET_PLATE",
  GET_JOBS = "GET_JOBS",
  GET_OPTIONS_FOR_LOOKUP = "GET_OPTIONS_FOR_LOOKUP",
  GET_TEMPLATE = "GET_TEMPLATE", // full template with annotations from MMS
  GET_TEMPLATES = "GET_TEMPLATES", // just template name from Labkey
  INITIATE_UPLOAD = "INITIATE_UPLOAD",
  REQUEST_METADATA = "REQUEST_METADATA",
  REQUEST_FILE_METADATA_FOR_JOB = "REQUEST_FILE_METADATA_FOR_JOB",
  RETRY_UPLOAD = "RETRY_UPLOAD",
  SAVE_TEMPLATE = "SAVE_TEMPLATE",
  SEARCH_FILE_METADATA = "SEARCH_FILE_METADATA",
  UPDATE_FILE_METADATA = "UPDATE_FILE_METADATA",
}

export enum JobFilter {
  All = "All",
  Failed = "Failed",
  InProgress = "In Progress",
  Successful = "Successful",
}

export interface PageToIndexMap {
  [page: string]: number;
}

export interface SearchResultRow {
  [key: string]: string | number | undefined;
}

export interface FeedbackStateBranch {
  alert?: AppAlert;
  deferredAction?: AnyAction; // action to dispatch when modal closes
  events: AppEvent[];
  folderTreeOpen: boolean;
  isLoading: boolean;
  requestsInProgress: string[];
  setMountPointNotificationVisible: boolean;
  uploadError?: string;
  visibleModals: ModalName[];
}

export interface JobStateBranch {
  // Parent job representing an upload of a batch of files
  uploadJobs: JSSJob[];
  // Parent upload jobs that are in progress
  inProgressUploadJobs: JSSJob[];
  // Child job representing the copy step of an upload job
  copyJobs: JSSJob[];
  // Child job representing the add metadata step of an upload job
  addMetadataJobs: JSSJob[];
  // List of upload jobs that may or may not be in-progress - used for reporting on jobs that succeed or failed on app
  // startup
  incompleteJobIds: string[];
  // Represents which filter has been selected on the Upload Summary page
  jobFilter: JobFilter;
  // Whether the app is polling for jobs
  polling: boolean;
}

export interface UploadStateBranch {
  [fullPath: string]: UploadMetadata;
}

// Think of this group as a composite key. No two rows should have the same combination of these values.
export interface UploadRowId {
  channelId?: string;
  file: string; // fullpath
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
}

// Metadata associated with a file
export interface UploadMetadata extends UploadRowId {
  barcode?: string;
  notes?: string[]; // only one note expected but we treat this like other custom annotations
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
  templateId?: number;
  [WELL_ANNOTATION_NAME]?: number[];
  [WORKFLOW_ANNOTATION_NAME]?: string[];
  [genericKey: string]: any;
}

export interface MetadataStateBranch {
  annotations: Annotation[];
  annotationLookups: AnnotationLookup[];
  annotationOptions: AnnotationOption[];
  annotationTypes: AnnotationType[];
  barcode?: string;
  barcodePrefixes: BarcodePrefix[];
  barcodeSearchResults: LabkeyPlateResponse[];
  channels: Channel[];
  // this represents the filepath to an upload draft that has been saved is currently opened in the upload wizard
  currentUploadFilePath?: string;
  fileMetadataForJob?: SearchResultRow[];
  fileMetadataSearchResults?: SearchResultRow[];
  imagingSessions: ImagingSession[];
  lookups: Lookup[];
  // for tracking whether an upload has changed when updating the upload
  originalUpload?: UploadStateBranch;
  templates: LabkeyTemplate[];
  users: LabkeyUser[];
  units: Unit[];
  // Gets updated every time app changes pages.
  // Stores last redux-undo index per page for each state branch (that we want to be able to undo)
  history: {
    selection: PageToIndexMap;
    template: PageToIndexMap;
    upload: PageToIndexMap;
  };
  workflowOptions: Workflow[];

  // expected type is string[] but typescript index signatures won't allow explicit typing like this in this case
  [lookupName: string]: any;
}

export type ModalName = "openTemplate" | "settings" | "templateEditor";

export enum Page {
  DragAndDrop = "DragAndDrop",
  SearchFiles = "SearchFiles",
  SelectUploadType = "SelectUploadType",
  AssociateFiles = "AssociateFiles",
  SelectStorageLocation = "SelectStorageIntent",
  AddCustomData = "AddCustomData",
  UploadSummary = "UploadSummary",
}

export interface RouteStateBranch {
  page: Page;
  view: Page;
}

export interface AnnotationDraft {
  annotationId?: number;
  annotationOptions?: string[];
  annotationTypeId: number;
  annotationTypeName: string;
  description?: string;
  index: number;
  name?: string;
  lookupSchema?: string;
  lookupTable?: string;
  required: boolean;
}

export interface TemplateDraft {
  annotations: AnnotationDraft[];
  name?: string;
  templateId?: number;
  version?: number;
}

export interface TemplateStateBranch {
  appliedTemplate?: Template;
  draft: TemplateDraft;
  original?: Template;
  originalTemplateHasBeenUsed?: boolean;
}

export interface State {
  // For tracking how to display the app and feedback like alerts and notifications
  feedback: FeedbackStateBranch;

  // Tracks everything related to uploads that have jobIds
  job: JobStateBranch;

  // Extra data that usually originates from the database
  metadata: MetadataStateBranch;

  // Which Upload wizard page to show, which tab to show
  route: RouteStateBranch;

  // Things that the user selects that we would be interested in keeping a history of (for undo/redo)
  // Include only selections that occur inside the upload tab
  selection: StateWithHistory<SelectionStateBranch>;

  // User settings that are manually and automatically created
  setting: SettingStateBranch;

  // Annotation template
  template: StateWithHistory<TemplateStateBranch>;

  // Tracks current upload metadata (no jobId).
  upload: StateWithHistory<UploadStateBranch>;
}

export interface TypeToDescriptionMap {
  [propName: string]: ActionDescription;
}

export interface AutoSaveAction extends AnyAction {
  autoSave: boolean;
}

export interface WriteToStoreAction extends AnyAction {
  updates?: { [key: string]: any };
  writeToStore: boolean;
}

export enum HTTP_STATUS {
  BAD_GATEWAY = 502,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500,
  NOT_FOUND = 404,
  OK = 200,
}
