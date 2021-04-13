import { PREFERRED_TEMPLATE_ID } from "../../../shared/constants";
import { Template, TemplateAnnotation } from "../../services/mms-client/types";
import { UploadStateBranch } from "../types";

import {
  CREATE_ANNOTATION,
  CREATE_ANNOTATION_OPTIONS,
  SAVE_TEMPLATE,
  SAVE_TEMPLATE_SUCCEEDED,
  SET_APPLIED_TEMPLATE,
} from "./constants";
import {
  CreateAnnotationAction,
  CreateAnnotationOptionsAction,
  CreateAnnotationRequest,
  SaveTemplateAction,
  SaveTemplateSucceededAction,
  SetAppliedTemplateAction,
} from "./types";

export function createAnnotation(
  annotationRequest: CreateAnnotationRequest
): CreateAnnotationAction {
  return {
    payload: annotationRequest,
    type: CREATE_ANNOTATION,
  };
}

export function createAnnotationOptions(
  annotationId: number,
  newDropdownOptions: string[]
): CreateAnnotationOptionsAction {
  return {
    payload: {
      annotationId,
      newDropdownOptions,
    },
    type: CREATE_ANNOTATION_OPTIONS,
  };
}

export function saveTemplate(
  name: string,
  annotations: TemplateAnnotation[],
  templateId?: number
): SaveTemplateAction {
  return {
    payload: {
      templateId,
      name,
      annotations,
    },
    type: SAVE_TEMPLATE,
  };
}

export function saveTemplateSucceeded(
  templateId: number
): SaveTemplateSucceededAction {
  return {
    payload: templateId,
    type: SAVE_TEMPLATE_SUCCEEDED,
    updates: {
      [PREFERRED_TEMPLATE_ID]: templateId,
    },
    writeToStore: true,
  };
}

export function setAppliedTemplate(
  template: Template,
  uploads: UploadStateBranch
): SetAppliedTemplateAction {
  return {
    autoSave: true,
    payload: {
      template,
      uploads,
    },
    type: SET_APPLIED_TEMPLATE,
  };
}
