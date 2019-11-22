import { createSelector } from "reselect";

import { State } from "../types";

export const getAssociateByWorkflow = (state: State) => state.setting.associateByWorkflow;
export const getLimsHost = (state: State) => state.setting.limsHost;
export const getLimsPort = (state: State) => state.setting.limsPort;
export const getLimsProtocol = (state: State) => state.setting.limsProtocol;
export const getMountPoint = (state: State) => state.setting.mountPoint;
export const getTemplateIds = (state: State) => state.setting.templateIds;

export const getLimsUrl = createSelector([
    getLimsProtocol,
    getLimsHost,
    getLimsPort,
], (protocol: string, host: string, port: string) => {
    return `${protocol}://${host}:${port}`;
});
