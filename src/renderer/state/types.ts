import {
  ipcRenderer,
  Menu,
  MessageBoxOptions,
  OpenDialogOptions,
  Remote,
} from "electron";
import { AnyAction } from "redux";
import { CreateLogic } from "redux-logic/definitions/logic";
import { StateWithHistory } from "redux-undo";

import { LimsUrl } from "../../shared/types";
import { AnnotationName } from "../constants";
import {
  ApplicationInfoService,
  FileManagementSystem,
  JobStatusClient,
  MMSClient,
} from "../services";
import { JSSJob } from "../services/job-status-client/types";
import LabkeyClient from "../services/labkey-client";
import {
  Annotation,
  AnnotationLookup,
  AnnotationOption,
  AnnotationType,
  Audited,
  BarcodePrefix,
  Channel,
  ImagingSession,
  LabkeyPlateResponse,
  LabkeyTemplate,
  Lookup,
  Unit,
} from "../services/labkey-client/types";
import { Template, WellResponse } from "../services/mms-client/types";
import { UploadServiceFields } from "../services/types";
import { LocalStorage } from "../types";

import Process = CreateLogic.Config.Process;
import DepObj = CreateLogic.Config.DepObj;
import SaveDialogOptions = Electron.SaveDialogOptions;

// T should be the type of a state branch
export interface ActionDescription<T> {
  accepts: (action: AnyAction) => boolean;
  perform: (state: T, action: any) => T;
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
  time: (timerName: string) => void;
  timeEnd: (timerName: string) => void;
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
  applicationInfoService: ApplicationInfoService;
  ctx?: any;
  dialog: Dialog;
  fms: FileManagementSystem;
  getApplicationMenu: () => Menu | null;
  ipcRenderer: typeof ipcRenderer;
  jssClient: JobStatusClient;
  labkeyClient: LabkeyClient;
  logger: Logger;
  mmsClient: MMSClient;
  readFile: (filePath: string, encoding?: string) => Promise<string | Buffer>;
  remote: Remote;
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
  // Used to track whether the user has seen this event
  viewed: boolean;
}

export enum AlertType {
  WARN = 1,
  SUCCESS,
  ERROR,
  INFO,
  DRAFT_SAVED,
}

export enum AsyncRequest {
  CANCEL_UPLOAD = "CANCEL_UPLOAD",
  CREATE_ANNOTATION = "CREATE_ANNOTATION",
  EDIT_ANNOTATION = "EDIT_ANNOTATION",
  GET_BARCODE_SEARCH_RESULTS = "GET_BARCODE_SEARCH_RESULTS",
  GET_JOBS = "GET_JOBS",
  GET_OPTIONS_FOR_LOOKUP = "GET_OPTIONS_FOR_LOOKUP",
  GET_TEMPLATE = "GET_TEMPLATE", // full template with annotations from MMS
  GET_TEMPLATES = "GET_TEMPLATES", // just template name from Labkey
  INITIATE_UPLOAD = "INITIATE_UPLOAD",
  GET_METADATA = "GET_METADATA",
  GET_FILE_METADATA_FOR_JOB = "GET_FILE_METADATA_FOR_JOB",
  UPLOAD = "UPLOAD",
  SAVE_TEMPLATE = "SAVE_TEMPLATE",
  UPDATE_FILE_METADATA = "UPDATE_FILE_METADATA",
  REQUEST_ANNOTATION_USAGE = "REQUEST_ANNOTATION_USAGE",
}

export interface PageToIndexMap {
  [page: string]: number;
}

export interface SearchResultRow {
  [key: string]: string | number | undefined;
}

export enum TutorialStep {
  MASS_EDIT,
  ADD_SCENES,
  INPUT_MULTIPLE_VALUES,
}

export interface FeedbackStateBranch {
  alert?: AppAlert;
  deferredAction?: AnyAction; // action to dispatch when modal closes
  events: AppEvent[];
  isLoading: boolean;
  requestsInProgress: string[];
  setMountPointNotificationVisible: boolean;
  tutorialTooltip?: TutorialStep;
  uploadError?: string;
  visibleModals: ModalName[];
}

export interface UploadProgressInfo {
  completedBytes: number;
  totalBytes: number;
  // timeLeft: number; // TODO later
}

export interface JobStateBranch {
  // Parent job representing an upload of a batch of files
  uploadJobs: JSSJob<UploadServiceFields>[];
  // mapping between  jobIds and their upload progress
  copyProgress: {
    [jobId: string]: UploadProgressInfo;
  };
  lastSelectedUpload?: { id: string; index: number };
  mostRecentSuccessfulETL?: number;
}

// Map of the output of getUploadRowKey to the FileModel
export interface UploadStateBranch {
  [fileModelKey: string]: FileModel;
}

// Think of this group as a composite key. No two rows should have the same combination of these values.
export interface FileModelId {
  channelId?: string;
  file: string; // fullpath
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
}

// Metadata associated with a file
export interface FileModel extends FileModelId {
  // Known custom annotations
  [AnnotationName.NOTES]?: string[];
  [AnnotationName.PLATE_BARCODE]?: string[];
  [AnnotationName.WELL]?: number[];
  [AnnotationName.IMAGING_SESSION]?: string[];
  // Any other annotations will be generically added
  [annotationName: string]: any;
}

export interface MetadataStateBranch {
  annotations: Annotation[];
  annotationIdToHasBeenUsed: { [annotationId: number]: boolean };
  annotationLookups: AnnotationLookup[];
  annotationOptions: AnnotationOption[];
  annotationTypes: AnnotationType[];
  barcode?: string;
  barcodePrefixes: BarcodePrefix[];
  barcodeSearchResults: LabkeyPlateResponse[];
  channels: Channel[];
  // this represents the filepath to an upload draft that has been saved is currently opened in the upload wizard
  currentUploadFilePath?: string;
  imagingSessions: ImagingSession[];
  lookups: Lookup[];
  // for tracking whether an upload has changed when updating the upload
  originalUploads?: UploadStateBranch;
  plateBarcodeToImagingSessions: PlateBarcodeToImagingSessions;
  templates: LabkeyTemplate[];
  units: Unit[];
  // Gets updated every time app changes pages.
  // Stores last redux-undo index per page for each state branch (that we want to be able to undo)
  history: {
    upload: PageToIndexMap;
  };

  // expected type is string[] but typescript index signatures won't allow explicit typing like this in this case
  [lookupName: string]: any;
}

export type ModalName = "openTemplate" | "templateEditor";

export enum Page {
  UploadWithTemplate = "UploadWithTemplate",
  NewUploadButton = "NewUploadButton",
  Notifications = "Notifications",
  Settings = "Settings",
  MyUploads = "MyUploads",
}

export interface RouteStateBranch {
  page: Page;
  view: Page;
}

export interface SelectionStateBranch extends UploadTabSelections {
  user: string;
}

export interface UploadKeyValue {
  columnId: string;
  rowId: string;
  rowIndex: number;
}

export interface UploadRowTableId {
  id: string;
  index: number;
}

export interface UploadTabSelections {
  cellAtDragStart?: UploadKeyValue;
  uploads: JSSJob<UploadServiceFields>[];
  massEditRow?: MassEditRow;
  rowsSelectedForDragEvent?: UploadRowTableId[];
  rowsSelectedForMassEdit?: string[];
  subFileSelectionModalFile?: string;
}

export interface AnnotationDraft extends Audited {
  annotationId: number;
  annotationOptions?: string[];
  annotationTypeId: number;
  annotationTypeName: string;
  description: string;
  name: string;
  lookupSchema?: string;
  lookupTable?: string;
  orderIndex: number;
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
}

export interface EnabledNotifications {
  [AlertType.WARN]: boolean;
  [AlertType.SUCCESS]: boolean;
  [AlertType.ERROR]: boolean;
  [AlertType.INFO]: boolean;
  [AlertType.DRAFT_SAVED]: boolean;
}

export interface SettingStateBranch extends LimsUrl {
  metadataColumns: string[];
  mountPoint?: string;
  // if true show hints on how to use the grid to enter data
  showUploadHint: boolean;
  showTemplateHint: boolean;
  templateId?: number;
  username: string;
  enabledNotifications: EnabledNotifications;
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

  // Things that the user selects that we would be interested in keeping a history of
  // Include only selections that occur inside the upload tab
  selection: SelectionStateBranch;

  // User settings that are manually and automatically created
  setting: SettingStateBranch;

  // Annotation template
  template: TemplateStateBranch;

  // Tracks current upload metadata (no jobId).
  upload: StateWithHistory<UploadStateBranch>;
}

// T should be the type of a state branch
export interface TypeToDescriptionMap<T> {
  [propName: string]: ActionDescription<T>;
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

export interface BarcodeSelectorOption {
  barcode: string;
  imagingSessionIds: Array<number | null>;
}

export interface RequestFailedAction {
  payload: {
    error: string;
    requestType: AsyncRequest | string;
  };
  type: string;
}

// Matches a Job but the created date is represented as a string
export interface UploadSummaryTableRow extends JSSJob<UploadServiceFields> {
  fileId?: string;
  filePath?: string;
  template?: string;
  progress?: UploadProgressInfo;
}

export interface MassEditRow {
  // custom annotations
  [key: string]: any;
}

export interface PlateBarcodeToImagingSessions {
  [plateBarcode: string]: {
    [imagingSessionId: number]: {
      imagingSessionId?: number;
      name?: string;
      wells: WellResponse[];
    };
  };
}
