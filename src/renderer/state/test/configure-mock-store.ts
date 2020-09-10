import {
  applyMiddleware,
  combineReducers,
  createStore,
  Middleware,
  Store,
} from "redux";
import { createLogicMiddleware, LogicMiddleware } from "redux-logic";
import { Logic } from "redux-logic/definitions/logic";
import { SinonStub, stub } from "sinon";

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
} from "../";
import { JobStatusClient, LabkeyClient, MMSClient } from "../../services";
import { FileManagementSystem } from "../../services/aicsfiles";
import { FSSClient } from "../../services/aicsfiles/connections";
import { LocalStorage } from "../../types";
import { State } from "../types";

import { Actions, default as ActionTracker } from "./action-tracker";
import { getMockStateWithHistory } from "./mocks";

export interface LocalStorageStub {
  clear: SinonStub;
  delete: SinonStub;
  get: SinonStub;
  has: SinonStub;
  reset: SinonStub;
  set: SinonStub;
}

export interface ReduxLogicDependencies {
  dialog: {
    showMessageBox: SinonStub;
    showOpenDialog: SinonStub;
  };
  fms: FileManagementSystem;
  getApplicationMenu: SinonStub;
  getRetryUploadWorker: SinonStub;
  getUploadWorker: SinonStub;
  httpClient: {
    get: SinonStub;
    post: SinonStub;
    put: SinonStub;
    patch: SinonStub;
    delete: SinonStub;
  };
  ipcRenderer: {
    on: SinonStub;
    send: SinonStub;
  };
  jssClient: JobStatusClient;
  labkeyClient: LabkeyClient;
  logger: {
    debug: SinonStub;
    error: SinonStub;
    info: SinonStub;
    warn: SinonStub;
  };
  mmsClient: MMSClient;
  readFile: SinonStub;
  storage: LocalStorageStub;
  writeFile: SinonStub;
}

export const storage: LocalStorageStub = {
  clear: stub(),
  delete: stub(),
  get: stub(),
  has: stub(),
  reset: stub(),
  set: stub(),
};
export const httpClient = {
  get: stub(),
  post: stub(),
  put: stub(),
  patch: stub(),
  delete: stub(),
};

export const jssClient = new JobStatusClient(
  httpClient,
  (storage as any) as LocalStorage,
  false
);
export const labkeyClient = new LabkeyClient(
  httpClient,
  (storage as any) as LocalStorage,
  false
);
export const mmsClient = new MMSClient(
  httpClient,
  (storage as any) as LocalStorage,
  false
);
export const fssClient = {
  startUpload: stub(),
  uploadComplete: stub(),
};
export const fms = new FileManagementSystem({
  getCopyWorker: stub().returns({
    postMessage: stub(),
    onerror: stub(),
    onmessage: stub(),
  }),
  fssClient: (fssClient as any) as FSSClient,
  jobStatusClient: jssClient,
  mmsClient,
});

export const switchEnvMenuItem = {
  enabled: true,
  label: "Switch Environment",
};

export const getApplicationMenu = stub().returns({
  items: [
    {
      enabled: true,
      label: "File",
      submenu: {
        items: [
          { enabled: true, label: "New" },
          { enabled: true, label: "Open" },
          switchEnvMenuItem,
        ],
      },
    },
  ],
});

export const dialog = {
  showMessageBox: stub(),
  showOpenDialog: stub(),
  showSaveDialog: stub(),
};

export const logger = {
  debug: stub(),
  error: stub(),
  info: stub(),
  time: stub(),
  timeEnd: stub(),
  warn: stub(),
};

export const ipcRenderer = {
  on: stub(),
  send: stub(),
};

export const mockReduxLogicDeps: ReduxLogicDependencies = {
  dialog,
  fms,
  getApplicationMenu,
  getRetryUploadWorker: stub(),
  getUploadWorker: stub(),
  httpClient,
  ipcRenderer,
  jssClient,
  labkeyClient,
  logger,
  mmsClient,
  readFile: stub().resolves("foo"),
  storage,
  writeFile: stub().resolves(),
};

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

const allLogics: Array<Logic<any, any, any, any, any, any>> = [
  ...feedback.logics,
  ...job.logics,
  ...metadata.logics,
  ...route.logics,
  ...selection.logics,
  ...setting.logics,
  ...template.logics,
  ...upload.logics,
];

const initialState: State = {
  feedback: feedback.initialState,
  job: job.initialState,
  metadata: metadata.initialState,
  route: route.initialState,
  selection: getMockStateWithHistory(selection.initialState),
  setting: setting.initialState,
  template: getMockStateWithHistory(template.initialState),
  upload: getMockStateWithHistory(upload.initialState),
};

export function createMockReduxStore(
  mockState: State = initialState,
  reduxLogicDependencies: ReduxLogicDependencies = mockReduxLogicDeps,
  logics?: Array<Logic<any, any, any, any, any, any>>,
  spreadBatched = true
): {
  store: Store;
  logicMiddleware: LogicMiddleware<State, ReduxLogicDependencies>;
  actions: Actions;
} {
  if (!logics) {
    logics = allLogics;
  }
  // redux-logic middleware
  const logicMiddleware: LogicMiddleware<
    State,
    ReduxLogicDependencies
  > = createLogicMiddleware(logics);
  logicMiddleware.addDeps(reduxLogicDependencies);

  // action tracking middleware
  const actionTracker = new ActionTracker();
  const trackActionsMiddleware: Middleware = () => (next) => (action) => {
    if (action.batch && spreadBatched) {
      actionTracker.track(...action.payload);
    } else {
      actionTracker.track(action);
    }
    return next(action);
  };
  const middleware = applyMiddleware(logicMiddleware, trackActionsMiddleware);
  const rootReducer = enableBatching<State>(combineReducers(reducers));

  return {
    actions: actionTracker.actions,
    logicMiddleware,
    store: createStore(rootReducer, mockState, middleware),
  };
}
