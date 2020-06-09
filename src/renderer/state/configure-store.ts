import { readFile as fsReadFile, writeFile as fsWriteFile } from "fs";
import { userInfo } from "os";
import { promisify } from "util";

import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { ipcRenderer, remote } from "electron";
import Store from "electron-store";
import * as Logger from "js-logger";
import { forEach, isNil } from "lodash";
import * as moment from "moment";
import {
  AnyAction,
  applyMiddleware,
  combineReducers,
  createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";

import {
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  TEMP_UPLOAD_STORAGE_KEY,
} from "../../shared/constants";
import LabkeyClient from "../util/labkey-client";
import MMSClient from "../util/mms-client";

import { addEvent } from "./feedback/actions";
import { AlertType } from "./feedback/types";
import { getCurrentUploadFilePath } from "./metadata/selectors";
import { State } from "./types";

import {
  enableBatching,
  feedback,
  job,
  metadata,
  route,
  selection,
  setting,
  template,
  upload,
} from "./";

const readFile = promisify(fsReadFile);
const writeFile = promisify(fsWriteFile);

const storage = new Store();

const reducers = {
  feedback: feedback.reducer,
  job: job.reducer,
  metadata: metadata.reducer,
  route: route.reducer,
  selection: selection.reducer,
  setting: setting.reducer,
  template: template.reducer,
  upload: upload.reducer,
};

const logics = [
  ...feedback.logics,
  ...job.logics,
  ...metadata.logics,
  ...route.logics,
  ...selection.logics,
  ...setting.logics,
  ...template.logics,
  ...upload.logics,
];

const username: string = userInfo().username;

export const reduxLogicDependencies = {
  dialog: remote.dialog,
  fms: new FileManagementSystem({
    host: LIMS_HOST,
    logLevel: "trace",
    port: LIMS_PORT,
    username,
  }),
  getApplicationMenu: () => remote.Menu.getApplicationMenu(),
  ipcRenderer,
  jssClient: new JobStatusClient({
    host: LIMS_HOST,
    logLevel: "debug",
    port: LIMS_PORT,
    username,
  }),
  labkeyClient: new LabkeyClient({
    host: LIMS_HOST,
    localStorage: storage,
    port: LIMS_PORT,
    protocol: LIMS_PROTOCOL,
  }),
  logger: Logger,
  mmsClient: new MMSClient({
    host: LIMS_HOST,
    localStorage: storage,
    port: LIMS_PORT,
    protocol: LIMS_PROTOCOL,
    username,
  }),
  readFile,
  storage,
  writeFile,
};

const autoSaver = (store: any) => (next: any) => async (action: AnyAction) => {
  let result = next(action);
  if (action.autoSave) {
    const nextState = store.getState();
    const currentUploadFilePath = getCurrentUploadFilePath(nextState);
    if (currentUploadFilePath) {
      try {
        await writeFile(currentUploadFilePath, JSON.stringify(nextState));
      } catch (e) {
        return next(
          addEvent(
            `Failed to autosave file: ${e.message}`,
            AlertType.ERROR,
            new Date()
          )
        );
      }
    } else {
      storage.set(TEMP_UPLOAD_STORAGE_KEY, nextState);
    }

    result = next(
      addEvent(
        `Your draft was saved at ${moment().format("h:mm a")}`,
        AlertType.INFO,
        new Date()
      )
    );
  }

  return result;
};

const storageWriter = () => (next: any) => (action: AnyAction) => {
  if (action.writeToStore && action.updates) {
    forEach(action.updates, (value: any, key: string) => {
      if (isNil(value)) {
        Logger.info(`Deleting key=${key} from local storage`);
        storage.delete(key);
      } else {
        Logger.info(`Writing to local storage for key: ${key}, and value:`);
        Logger.info(JSON.stringify(value));
        storage.set(key, value);
      }
    });
  }
  return next(action);
};

export default function createReduxStore(initialState?: State) {
  const logicMiddleware = createLogicMiddleware(logics, reduxLogicDependencies);
  const middleware = applyMiddleware(logicMiddleware, autoSaver, storageWriter);
  const rootReducer = enableBatching<State>(combineReducers(reducers));

  if (initialState) {
    return createStore(rootReducer, initialState, middleware);
  }

  return createStore(rootReducer, middleware);
}
