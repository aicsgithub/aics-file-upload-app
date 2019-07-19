// Event channels
// emitted by main process when an upload is initiated
export const START_UPLOAD = "START_UPLOAD";

// emitted by main process if upload by aicsfiles finishes successfully
export const UPLOAD_FINISHED = "UPLOAD_FINISHED";

// emitted by main process if upload by aicsfiles throws an error
export const UPLOAD_FAILED = "UPLOAD_FAILED";

// emitted by main process when user clicks link to create plate standalone
export const OPEN_CREATE_PLATE_STANDALONE = "OPEN_CREATE_PLATE";

// emitted by main process when user creates a plate through standalone
export const PLATE_CREATED = "PLATE-CREATED";

// emitted by main process when user wants to switch environments
export const SET_LIMS_URL = "SET_LIMS_URL";

// emitted by main process when user tries to exit the app
export const SAFELY_CLOSE_WINDOW = "SAFELY_CLOSE_WINDOW";

// emitted by main process when user selects File > New > Schema
export const OPEN_CREATE_SCHEMA_MODAL = "OPEN_CREATE_SCHEMA_MODAL";

// User settings
export const LIMS_HOST = process.env.ELECTRON_WEBPACK_APP_LIMS_HOST || "localhost";
export const LIMS_PORT = process.env.ELECTRON_WEBPACK_APP_LIMS_PORT || "8080";
export const LIMS_PROTOCOL = process.env.ELECTRON_WEBPACK_APP_LIMS_PROTOCOL || "http";

// User setting storage
export const USER_SETTINGS_KEY = "userSettings";
