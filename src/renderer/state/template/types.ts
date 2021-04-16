import { Annotation, Audited } from "../../services/labkey-client/types";
import { Template, TemplateAnnotation } from "../../services/mms-client/types";
import {
  AutoSaveAction,
  UploadStateBranch,
  WriteToStoreAction,
} from "../types";

export interface CreateAnnotationRequest {
  name: string;
  description: string;
  annotationTypeId: number;
  dropdownOptions?: string[];
  lookupSchema?: string;
  lookupTable?: string;
}

export interface CreateAnnotationAction {
  payload: CreateAnnotationRequest;
  type: string;
}

export interface CreateAnnotationOptionsAction {
  payload: {
    newDropdownOptions: string[];
    annotationId: number;
  };
  type: string;
}

export interface GetTemplateAction {
  payload: {
    addAnnotationsToUpload: boolean;
    templateId: number;
  };
  type: string;
}

export interface StartEditingTemplateAction {
  payload: Template;
  type: string;
}

export interface SaveTemplateAction {
  payload: {
    templateId?: number;
    name: string;
    annotations: TemplateAnnotation[];
  };
  type: string;
}

export interface SaveTemplateSucceededAction extends WriteToStoreAction {
  payload: number;
  type: string;
}

export interface SetAppliedTemplateAction extends AutoSaveAction {
  payload: {
    template: Template;
    uploads: UploadStateBranch;
  };
  type: string;
}

// if dropdown, annotationOptions array is supplied
export interface AnnotationWithOptions extends Annotation {
  annotationOptions?: string[];
}

export interface TemplateAnnotationWithTypeName extends TemplateAnnotation {
  type: string; // name of annotationType
}

export interface TemplateWithTypeNames extends Audited {
  annotations: TemplateAnnotationWithTypeName[];
  name: string;
  templateId: number;
  version: number;
}
