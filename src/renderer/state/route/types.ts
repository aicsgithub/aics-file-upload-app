import { JSSJob } from "@aics/job-status-client/type-declarations/types";

export interface RouteStateBranch {
    page: Page;
    view: Page;
}

export interface AppPageConfig {
    container: JSX.Element;
}

export interface CloseUploadTabAction {
    type: string;
}

export interface GoBackAction {
    type: string;
}

export interface NextPageAction {
    type: string;
}

export enum Page {
    DragAndDrop = "DragAndDrop",
    SearchFiles = "SearchFiles",
    SelectUploadType = "SelectUploadType",
    AssociateFiles = "AssociateFiles",
    SelectStorageLocation = "SelectStorageIntent",
    AddCustomData = "AddCustomData",
    UploadSummary = "UploadSummary",
}

export interface SelectPageAction {
    payload: {
        currentPage: Page;
        nextPage: Page;
    };
    type: string;
}

export interface SelectViewAction {
    payload: string;
    type: string;
}

export interface OpenEditFileMetadataTabAction {
    payload: JSSJob; // upload job associated with file metadata
    type: string;
}
