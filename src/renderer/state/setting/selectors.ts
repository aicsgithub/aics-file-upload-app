import { createSelector } from "reselect";

import { BROWSE_FOR_EXISTING_SCHEMA } from "../constants";
import { State } from "../types";
import { SchemaFileOption } from "../upload/types";

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

export const getSchemaFileOptions = createSelector([getSchemaFilepaths], (schemaFilepaths: string[]):
                                                   SchemaFileOption[] => {
    return [
        ...schemaFilepaths.map((filepath: string) => ({ filepath })),
        { filepath: BROWSE_FOR_EXISTING_SCHEMA },
    ];
});
