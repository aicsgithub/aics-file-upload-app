export interface RouteStateBranch {
    page: Page;
    view: Page;
}

export interface AppPageConfig {
    container: JSX.Element;
}

export interface GoBackAction {
    type: string;
}

export interface NextPageAction {
    type: string;
}

export enum Page {
    DragAndDrop = "DragAndDrop",
    SelectUploadType = "SelectUploadType",
    AssociateFiles = "AssociateFiles",
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
