import "core-js/es6/map";
import "core-js/es6/promise";
import "core-js/es6/set";
import axios from "axios";
import { remote } from "electron";
import * as Logger from "js-logger";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import { APP_ID } from "./constants";
import App from "./containers/App";
import createReduxStore from "./state/configure-store";
import { setSwitchEnvEnabled } from "./state/route/logics";

const appContainer = document.getElementById(APP_ID);
render(
  <Provider store={createReduxStore()}>
    <App />
  </Provider>,
  appContainer
);

// Prevent default behavior from div containing app and let app handle file drop
if (appContainer) {
  const returnFalse = () => false;
  appContainer.ondragover = returnFalse;
  appContainer.ondragleave = returnFalse;
  appContainer.ondragend = returnFalse;
  appContainer.ondrop = returnFalse;
}

const menu = remote.Menu.getApplicationMenu();
if (menu) {
  setSwitchEnvEnabled(menu, true, Logger);
}

// Configure Axios to use the `XMLHttpRequest` adapter. Axios uses either
// `XMLHttpRequest` or Node's `http` module, depending on the environment it is
// running in. See more info here: https://github.com/axios/axios/issues/552.
// In our case, Axios was using Node's `http` module. Due to this, network
// requests were not visible in the "Network" tab of the Chromium dev tools,
// because the requests were happening in the Node layer, rather than the
// Chromium layer. Additionally, we had seen cases for many months where the app
// would hang after making network requests. This issue completely disappears
// when using the `XMLHttpRequest` adapter. This may be due to some unresolved
// issues with Electron and/or Node running on
// Linux (https://github.com/electron/electron/issues/10570).
axios.defaults.adapter = require("axios/lib/adapters/xhr");
