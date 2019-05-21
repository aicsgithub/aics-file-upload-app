import { State } from "../types";

export const getUploadStatus = (state: State) => state.job.uploadStatus;
