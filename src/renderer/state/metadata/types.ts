import { LabkeyPlateResponse } from "../../util/labkey-client/types";
import { Workflow } from "../selection/types";
import { Annotation, AnnotationType } from "../template/types";

export interface MetadataStateBranch {
    annotations: Annotation[];
    annotationTypes: AnnotationType[];
    barcode?: string;
    barcodePrefixes: BarcodePrefix[];
    barcodeSearchResults: LabkeyPlateResponse[];
    databaseMetadata?: DatabaseMetadata;
    imagingSessions: ImagingSession[];
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

export interface GetAnnotationsAction {
    type: string;
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

export interface GetBarcodeSearchResultsAction {
    payload: string;
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

export interface DatabaseMetadata {
    [displayName: string]: Table;
}

export interface Table {
    name: string;
    schemaName: string;
    displayName: string; // name with schema prefixed if duplicate
    columns: string[];
}
