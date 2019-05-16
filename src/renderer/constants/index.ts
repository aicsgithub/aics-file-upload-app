import { isEmpty } from "lodash";
import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../shared/constants";

export const APP_ID = "app";

export const HOST = `${LIMS_HOST}:${LIMS_PORT}`;

export const LABKEY_URL = `${LIMS_PROTOCOL}://${HOST}/labkey`;
export const LABKEY_SELECT_ROWS_URL = (schema: string, table: string, additionalQueries: string[] = []) => {
    const base = `${LABKEY_URL}/AICS/query-selectRows.api?schemaName=${schema}&query.queryName=${table}`;
    if (!isEmpty(additionalQueries)) {
        return `${base}&${additionalQueries.join("&")}`;
    }

    return base;
};

// Metadata Management Service
export const MMS_BASE_URL = `${LIMS_PROTOCOL}://${HOST}/metadata-management-service`;

// Labkey Schemas
export const LK_MICROSCOPY_SCHEMA = "microscopy";
