import { ColumnProps } from "antd/lib/table";
import { LabkeyPlateResponse, LabkeyTemplate, LabkeyUser } from "../../util/labkey-client/types";
import { Workflow } from "../selection/types";
import { Annotation, AnnotationLookup, AnnotationOption, AnnotationType, Lookup } from "../template/types";

export interface MetadataStateBranch {
    annotations: Annotation[];
    annotationLookups: AnnotationLookup[];
    annotationOptions: AnnotationOption[];
    annotationTypes: AnnotationType[];
    barcode?: string;
    barcodePrefixes: BarcodePrefix[];
    barcodeSearchResults: LabkeyPlateResponse[];
    channels: Channel[];
    fileMetadataForJob?: SearchResultRow[];
    fileMetadataSearchResults?: SearchResultRow[];
    imagingSessions: ImagingSession[];
    lookups: Lookup[];
    templates: LabkeyTemplate[];
    users: LabkeyUser[];
    units: Unit[];
    // Gets updated every time app changes pages.
    // Stores last redux-undo index per page for each state branch (that we want to be able to undo)
    history: {
        selection: PageToIndexMap;
        template: PageToIndexMap;
        upload: PageToIndexMap;
    };
    workflowOptions: Workflow[];

    // expected type is string[] but typescript index signatures won't allow explicit typing like this in this case
    [lookupName: string]: any;
}

export interface BarcodePrefix {
    description: string;
    prefixId: number;
    prefix: string;
}

export interface Channel {
    channelId: number;
    name: string;
    description: string;
}

export interface ImagingSession {
    imagingSessionId: number;
    name: string;
    description: string;
}

export interface SearchResultRow {
    [key: string]: string | number | undefined;
}

// This wrapper interface is merely to convince ts-lint that title is always present
export interface SearchResultsHeader extends ColumnProps<SearchResultRow> {
    title: string;
}

export interface SearchConfig {
    annotation?: string;
    fileIds?: string[];
    searchValue?: string;
    template?: string;
    user?: string;
}

export interface GetAnnotationsAction {
    type: string;
}

export interface GetOptionsForLookupAction {
    payload: string;
    type: string;
}

export interface PageToIndexMap {
    [page: string]: number;
}

export interface RequestFileMetadataForJobAction {
    payload: string[];
    type: string;
}

export interface ClearFileMetadataForJobAction {
    type: string;
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
        template: {
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

export interface GetTemplatesAction {
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

export interface ResetHistoryAction {
    type: string;
}

export interface SearchFileMetadataAction {
    payload: SearchConfig;
    type: string;
}

export interface ExportFileMetadataAction {
    payload: string;
    type: string;
}
