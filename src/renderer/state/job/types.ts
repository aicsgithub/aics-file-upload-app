export interface JobStateBranch {
    uploadStatus: string;
}

export interface SetUploadStatusAction {
    payload: string;
    type: string;
}
