import { Workflow } from "../selection/types";

export interface MetadataStateBranch {
    barcode?: string;
    imagingSessions: ImagingSession[];
    barcodePrefixes: BarcodePrefix[];
    units: Unit[];
    // Gets updated every time app changes pages.
    // Stores last redux-undo index per page for each state branch (that we want to be able to undo)
    history: {
        selection: PageToIndexMap;
        upload: PageToIndexMap;
    };
    workflowOptions: Workflow[];
}

export interface BarcodePrefix {
    description: string;
    prefixId: number;
    prefix: string;
}

export interface ImagingSession {
    imagingSessionId: number;
    name: string;
    description: string;
}

export interface PageToIndexMap {
    [page: string]: number;
}

export interface ReceiveMetadataAction {
    payload: Partial<MetadataStateBranch>;
    type: string;
}

export interface RequestMetadataAction {
    type: string;
}

export interface UpdatePageHistoryMapAction {
    payload: {
        selection: {
            [page: string]: number,
        },
        upload: {
            [page: string]: number,
        },
    };
    type: string;
}

export interface CreateBarcodeAction {
    payload: BarcodePrefix;
    type: string;
}

export interface GetImagingSessionsAction {
    type: string;
}

export interface RequestWorkflowOptionsAction {
    type: string;
}

export interface GetBarcodePrefixesAction {
    type: string;
}

export interface Unit {
    description: string;
    name: string;
    type: string;
    unitsId: number;
}

export interface LabkeyUnit {
    Type: string;
    Description: string;
    UnitsId: number;
    Name: string;
}
