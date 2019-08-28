import { State } from "../types";

// BASIC SELECTORS
export const getMetadata = (state: State) => state.metadata;
export const getUnits = (state: State) => state.metadata.units;
export const getImagingSessions = (state: State) => state.metadata.imagingSessions;
export const getBarcodePrefixes = (state: State) => state.metadata.barcodePrefixes;
export const getSelectionHistory = (state: State) => state.metadata.history.selection;
export const getUploadHistory = (state: State) => state.metadata.history.upload;
export const getWorkflowOptions = (state: State) => state.metadata.workflowOptions;
export const getDatabaseMetadata = (state: State) => state.metadata.databaseMetadata;

// COMPOSED SELECTORS
