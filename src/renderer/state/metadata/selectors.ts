import { State } from "../types";

// BASIC SELECTORS
export const getMetadata = (state: State) => state.metadata;
export const getUnits = (state: State) => state.metadata.units;
export const getImagingSessions = (state: State) => state.metadata.imagingSessions;
export const getSelectionHistory = (state: State) => state.metadata.history.selection;
export const getUploadHistory = (state: State) => state.metadata.history.upload;

// COMPOSED SELECTORS
