export const START_UPLOAD = "START_UPLOAD";
export const UPLOAD_FINISHED = "UPLOAD_FINISHED";
export const UPLOAD_FAILED = "UPLOAD_FAILED";
export const OPEN_CREATE_PLATE_STANDALONE = "OPEN_CREATE_PLATE";
export const PLATE_CREATED = "PLATE-CREATED";

export const LIMS_HOST = process.env.ELECTRON_WEBPACK_APP_LIMS_HOST || "localhost";
export const LIMS_PORT = process.env.ELECTRON_WEBPACK_APP_LIMS_PORT || "80";
export const LIMS_PROTOCOL = process.env.ELECTRON_WEBPACK_APP_LIMS_PROTOCOL || "http";
