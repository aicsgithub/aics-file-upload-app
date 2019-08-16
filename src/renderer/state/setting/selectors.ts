import { createSelector } from "reselect";

import { State } from "../types";

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
