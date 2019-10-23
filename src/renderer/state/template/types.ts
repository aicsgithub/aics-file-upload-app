import { Audited } from "../types";

// todo consider flattening
export interface TemplateStateBranch {
    draft: TemplateDraft;
}

export interface AddAnnotationAction {
    payload: string | Annotation; // new annotation name or existing annotation
    type: string;
}

export interface Annotation extends Audited {
    annotationId: number;
    annotationOptions?: string[];
    annotationTypeId: number;
    canHaveMany: boolean;
    description: string;
    name: string;
    required: boolean;
    lookupColumn?: string;
    lookupSchema?: string;
    lookupTable?: string;
}

export interface AnnotationDraft {
    annotationId?: number;
    canHaveMany: boolean;
    description?: string;
    index: number;
    name?: string;
    required: boolean;
    type: AnnotationTypeDraft;
}

export interface AnnotationLookup {
    annotationId: number;
    lookupId: number;
}

export type AnnotationRequest = CreateAnnotationRequest | { annotationId: number };

export interface AnnotationType {
    annotationTypeId: number;
    name: string;
}

export interface AnnotationTypeDraft {
    annotationOptions?: string[];
    annotationTypeId: number;
    lookupColumn?: string;
    lookupSchema?: string;
    lookupTable?: string;
    name: string;
}

// todo rename to AnnotationTypeName
export enum ColumnType {
    TEXT = "Text",
    DROPDOWN = "Dropdown",
    BOOLEAN = "Yes/No",
    NUMBER = "Number",
    DATE = "Date/Time",
    LOOKUP = "Lookup",
}

export interface ClearTemplateDraftAction {
    type: string;
}

export interface CreateAnnotationRequest {
    annotationOptions?: string[];
    annotationTypeId: number;
    canHaveMany: boolean;
    description: string;
    name: string;
    lookupColumn?: string;
    lookupSchema?: string;
    lookupTable?: string;
    required: boolean;
}

export interface GetTemplateAction {
    payload: number;
    type: string;
}

export interface Lookup extends Audited {
    columnName: string;
    descriptionColumn: string;
    lookupId: number;
    schemaName: string;
    tableName: string;
}

export interface RemoveAnnotationsAction {
    payload: number[];
    type: string;
}

export interface SaveTemplateAction {
    payload?: number;
    type: string;
}

export interface SaveTemplateRequest {
    name: string;
    annotations: AnnotationRequest;
}

export interface Template extends Audited {
    annotations: Annotation[];
    name: string;
    templateId: number;
    version: number;
}

export interface TemplateDraft {
    annotations: AnnotationDraft[];
    name?: string;
    templateId?: number;
    version?: number;
}

export interface UpdateTemplateDraftAction {
    payload: Partial<TemplateDraft>;
    type: string;
}
