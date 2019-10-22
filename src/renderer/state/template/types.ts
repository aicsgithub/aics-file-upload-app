import { Audited } from "../types";

export interface TemplateStateBranch {
    draft?: TemplateDraft;
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
    annotationOptions?: string[];
    type: AnnotationType;
    canHaveMany: boolean;
    description?: string;
    name?: string;
    required: boolean;
    lookupColumn?: string;
    lookupSchema?: string;
    lookupTable?: string;
}

export type AnnotationRequest = CreateAnnotationRequest | { annotationId: number };

export interface AnnotationType {
    annotationTypeId: number;
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

export interface EditTemplateAction {
    payload: Template;
    type: string;
}

export interface GetTemplateAction {
    payload: {
        editTemplate?: boolean;
        templateId: number;
    };
    type: string;
}

export interface SaveTemplateAction {
    payload: number;
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
