import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
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
import LabkeyClient from "../../util/labkey-client";
import MMSClient from "../../util/mms-client";
import { State } from "../types";

import { Actions, default as ActionTracker } from "./action-tracker";
import { getMockStateWithHistory } from "./mocks";

export interface LocalStorageStub {
  clear: SinonStub;
  delete: SinonStub;
  get: SinonStub;
  has: SinonStub;
  set: SinonStub;
}

export interface ReduxLogicDependencies {
  dialog: {
    showMessageBox: SinonStub;
    showOpenDialog: SinonStub;
  };
  fms: FileManagementSystem;
  getApplicationMenu: SinonStub;
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

const host = "localhost";
const port = "80";
const protocol = "http";
const username = "foo";
export const storage: LocalStorageStub = {
  clear: stub(),
  delete: stub(),
  get: stub(),
  has: stub(),
  set: stub(),
};

export const fms = new FileManagementSystem({ host, port });
export const jssClient = new JobStatusClient({ host, port, username });
export const labkeyClient = new LabkeyClient({
  host,
  localStorage: storage,
  port,
  protocol,
});
export const mmsClient = new MMSClient({
  host,
  localStorage: storage,
  port,
  protocol,
  username,
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
  warn: stub(),
};

export const mockReduxLogicDeps: ReduxLogicDependencies = {
  dialog,
  fms,
  getApplicationMenu,
  ipcRenderer: {
    on: stub(),
    send: stub(),
  },
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
