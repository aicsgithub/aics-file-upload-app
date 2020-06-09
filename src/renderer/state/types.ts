import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { Menu, MessageBoxOptions, OpenDialogOptions } from "electron";
import { AnyAction } from "redux";
import { CreateLogic } from "redux-logic/definitions/logic";
import { StateWithHistory } from "redux-undo";

import LabkeyClient from "../util/labkey-client";
import MMSClient from "../util/mms-client";

import { FeedbackStateBranch } from "./feedback/types";
import { JobStateBranch } from "./job/types";
import { MetadataStateBranch } from "./metadata/types";
import { RouteStateBranch } from "./route/types";
import { SelectionStateBranch } from "./selection/types";
import { SettingStateBranch } from "./setting/types";
import { TemplateStateBranch } from "./template/types";
import { UploadStateBranch } from "./upload/types";
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

export interface LocalStorage {
  clear: () => void;
  delete: (key: string) => void;
  get: (key: string) => any;
  has: (key: string) => boolean;
  set: (key: string, value: any) => void;
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

export interface Audited {
  created: Date;
  createdBy: number;
  modified: Date;
  modifiedBy: number;
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
