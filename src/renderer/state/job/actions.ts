import { SET_UPLOAD_STATUS } from "./constants";
import { SetUploadStatusAction } from "./types";

export function setUploadStatus(status: string): SetUploadStatusAction {
    return {
        payload: status,
        type: SET_UPLOAD_STATUS,
    };
}
