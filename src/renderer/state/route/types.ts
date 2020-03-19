export interface RouteStateBranch {
    nextPage?: Page; // defined if user is to be redirected after clicking on an alert
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
