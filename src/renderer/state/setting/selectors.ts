import { createSelector } from "reselect";

import { SchemaFileOption } from "../upload/types";
import { State } from "../types";
import { BROWSE_FOR_EXISTING_SCHEMA } from "../constants";

export const getLimsHost = (state: State) => state.setting.limsHost;
export const getLimsPort = (state: State) => state.setting.limsPort;
export const getLimsProtocol = (state: State) => state.setting.limsProtocol;
export const getSchemaFilepaths = (state: State) => state.setting.schemaFilepaths;

export const getLimsUrl = createSelector([
    getLimsProtocol,
    getLimsHost,
    getLimsPort,
], (protocol: string, host: string, port: string) => {
    return `${protocol}://${host}:${port}`;
});

export const getSchemaFileOptions = createSelector([getSchemaFilepaths], (schemaFilepaths: string[]): SchemaFileOption[] => {
    const schemaFileOptions = schemaFilepaths.map((filepath: string) => ({ filepath }));
    schemaFileOptions.push({ filepath: BROWSE_FOR_EXISTING_SCHEMA });
    return schemaFileOptions;
});
