import { Annotation, Audited } from "../../services/labkey-client/types";
import { Template, TemplateAnnotation } from "../../services/mms-client/types";
import { AutoSaveAction } from "../types";
import { UploadStateBranch } from "../upload/types";

export interface TemplateStateBranch {
  appliedTemplate?: Template;
  draft: TemplateDraft;
  original?: Template;
  originalTemplateHasBeenUsed?: boolean;
}

export interface AddExistingAnnotationAction {
  payload: Annotation;
  type: string;
}

export interface AnnotationDraft {
  annotationId?: number;
  annotationOptions?: string[];
  annotationTypeId: number;
  annotationTypeName: string;
  description?: string;
  index: number;
  name?: string;
  lookupSchema?: string;
  lookupTable?: string;
  required: boolean;
}

// if dropdown, annotationOptions array is supplied
export interface AnnotationWithOptions extends Annotation {
  annotationOptions?: string[];
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

export interface StartTemplateDraftAction {
  payload: {
    draft: TemplateDraft;
    original: Template;
    originalTemplateHasBeenUsed: boolean;
  };
  type: string;
}

export interface StartTemplateDraftFailedAction {
  payload: string;
  type: string;
}
