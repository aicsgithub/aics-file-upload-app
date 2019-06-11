import "core-js/es6/map";
import "core-js/es6/promise";
import "core-js/es6/set";

import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import { APP_ID } from "./constants";
import App from "./containers/App";
import createReduxStore from "./state/configure-store";

const appContainer = document.getElementById(APP_ID);
render(
    <Provider store={createReduxStore()}>
        <App />
    </Provider>,
    appContainer);

// Prevent default behavior from div containing app and let app handle file drop
if (appContainer) {
    const returnFalse = () => false;
    appContainer.ondragover = returnFalse;
    appContainer.ondragleave = returnFalse;
    appContainer.ondragend = returnFalse;
    appContainer.ondrop = returnFalse;
}
