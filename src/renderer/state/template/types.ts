import { Audited, AutoSaveAction } from "../types";
import { UploadStateBranch } from "../upload/types";

export interface TemplateStateBranch {
    appliedTemplate?: Template;
    draft: TemplateDraft;
}

export interface AddExistingAnnotationAction {
    payload: Annotation;
    type: string;
}

export interface Annotation extends Audited {
    annotationId: number;
    annotationTypeId: number;
    description: string;
    exposeToFileUploadApp?: boolean;
    name: string;
}

export interface AnnotationDraft {
    annotationId?: number;
    annotationOptions?: string[];
    annotationTypeId: number;
    annotationTypeName: string;
    canHaveManyValues: boolean;
    description?: string;
    index: number;
    name?: string;
    lookupSchema?: string;
    lookupTable?: string;
    required: boolean;
}

export interface AnnotationLookup {
    annotationId: number;
    lookupId: number;
}

export interface AnnotationOption {
    annotationId: number;
    annotationOptionId: number;
    value: string;
}

export interface AnnotationType {
    annotationTypeId: number;
    name: ColumnType;
}

// if dropdown, annotationOptions array is supplied
export interface AnnotationWithOptions extends Annotation {
    annotationOptions?: string[];
}

export enum ColumnType {
    TEXT = "Text",
    DROPDOWN = "Dropdown",
    BOOLEAN = "YesNo",
    NUMBER = "Number",
    DATE = "Date",
    DATETIME = "DateTime",
    LOOKUP = "Lookup",
}

export interface ClearTemplateDraftAction {
    type: string;
}

export interface ClearTemplateHistoryAction {
    type: string;
}

export interface GetTemplateAction {
    payload: {
        addAnnotationsToUpload: boolean;
        templateId: number;
    };
    type: string;
}

export interface JumpToPastTemplateAction {
    index: number;
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
    type: string;
}

export interface SetAppliedTemplateAction extends AutoSaveAction {
    payload: {
        template: Template;
        uploads: UploadStateBranch;
    };
    type: string;
}

export interface Template extends Audited {
    annotations: TemplateAnnotation[];
    name: string;
    templateId: number;
    version: number;
}

export interface TemplateAnnotation extends Audited {
    annotationId: number;
    annotationOptions?: string[];
    annotationTypeId: number;
    canHaveManyValues: boolean;
    description: string;
    lookupSchema?: string;
    lookupTable?: string;
    name: string;
    required: boolean;
}

export interface TemplateAnnotationWithTypeName extends TemplateAnnotation {
    type: string; // name of annotationType
}

export interface TemplateDraft {
    annotations: AnnotationDraft[];
    name?: string;
    templateId?: number;
    version?: number;
}

export interface TemplateWithTypeNames extends Audited {
    annotations: TemplateAnnotationWithTypeName[];
    name: string;
    templateId: number;
    version: number;
}

export interface UpdateTemplateDraftAction {
    payload: Partial<TemplateDraft>;
    type: string;
}
