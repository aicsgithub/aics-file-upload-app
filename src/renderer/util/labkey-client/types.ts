export interface LabkeyPlate {
    BarCode: string;
    ImagingSessionId: number;
}

export interface GetBarcodesResponse {
    data: {
        rowCount: number,
        rows: LabkeyPlate[],
    };
}

export interface GetTablesResponseColumn {
    caption: string; // name with spaces (ex. DonorPlasmidBatch -> Donor Plasmid Batch)
    name: string; // actual name
}

export interface GetTablesResponseQuery {
    columns: GetTablesResponseColumn[];
    isUserDefined: boolean; // is the query defined in a codebase or in LK memory
    name: string;
}

export interface GetTablesResponse {
    schemaName: string;
    queries: GetTablesResponseQuery[];
}

export interface LabkeyImagingSession {
    ImagingSessionId: number;
    Name: string;
    Description: string;
}

export interface LabKeyPlateBarcodePrefix {
    PlateBarcodePrefixId: number;
    Prefix: string;
    TeamName: string;
}

export interface LabkeyPlateResponse {
    barcode: string;
    imagingSessionId: number | null;
}

export interface LabKeyWorkflow {
    Description: string;
    Name: string;
    WorkflowId: number;
}
