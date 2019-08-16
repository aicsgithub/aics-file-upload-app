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

export const LABKEY_GET_TABLES_URL = (): string => `${LABKEY_URL}/AICS/query-getQueries.api`;

// Metadata Management Service
export const MMS_BASE_URL = `${LIMS_PROTOCOL}://${HOST}/metadata-management-service`;

// Labkey Schemas
export const LK_MICROSCOPY_SCHEMA = "microscopy";

// There are more schemas, but these are the only ones (AFAIK) that users use
export const SCHEMAS = [
    "assayscustom",
    "celllines",
    LK_MICROSCOPY_SCHEMA,
    "processing"
];
