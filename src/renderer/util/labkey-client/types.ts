export interface LabkeyAudited {
    Created: string; // Date string
    CreatedBy: number;
    Modified: string; // Date string
    ModifiedBy: number;
}

export interface LabkeyAnnotation extends LabkeyAudited {
    AnnotationId: number;
    AnnotationTypeId: number;
    Name: string;
}

export interface LabkeyAnnotationLookup {
    AnnotationId: number;
    LookupId: number;
}

export interface LabkeyAnnotationType {
    AnnotationTypeId: number;
    Name: string;
}

export interface LabkeyLookup {
    ColumnName: string;
    DescriptionColumn: string;
    LookupId: number;
    SchemaName: string;
    TableName: string;
}

export interface LabkeyPlate {
    BarCode: string;
    ImagingSessionId: number;
}

export interface LabkeyResponse<T> {
    columnModel: Array<{dataIndex: string}>;
    rowCount: number;
    rows: T[];
}

export interface LabkeyTemplate {
    Name: string;
    TemplateId: number;
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

export interface LabkeyChannel {
    ContentTypeId: number;
    Description: string;
    Name: string;
}
