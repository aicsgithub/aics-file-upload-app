import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../shared/constants";

export const APP_ID = "app";

export const HOST = `${LIMS_HOST}:${LIMS_PORT}`;

// Metadata Management Service
export const MMS_BASE_URL = `${LIMS_PROTOCOL}://${HOST}/metadata-management-service`;
