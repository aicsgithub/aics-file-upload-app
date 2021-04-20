import { PREFERRED_TEMPLATE_ID } from "../../../shared/constants";
import { Annotation } from "../../services/labkey-client/types";
import {
  CreateAnnotationRequest,
  Template,
} from "../../services/mms-client/types";
import { TemplateDraft, UploadStateBranch } from "../types";

import {
  ADD_ANNOTATION,
  ADD_EXISTING_TEMPLATE,
  CLEAR_TEMPLATE_DRAFT,
  CREATE_ANNOTATION,
  REMOVE_ANNOTATIONS,
  SAVE_TEMPLATE,
  SAVE_TEMPLATE_SUCCEEDED,
  SET_APPLIED_TEMPLATE,
  START_TEMPLATE_DRAFT,
  START_TEMPLATE_DRAFT_FAILED,
  UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import {
  AddExistingAnnotationAction,
  AddExistingTemplateAction,
  ClearTemplateDraftAction,
  CreateAnnotationAction,
  RemoveAnnotationsAction,
  SaveTemplateAction,
  SaveTemplateSucceededAction,
  SetAppliedTemplateAction,
  StartTemplateDraftAction,
  StartTemplateDraftFailedAction,
  UpdateTemplateDraftAction,
} from "./types";

export function addExistingAnnotation(
  annotation: Annotation
): AddExistingAnnotationAction {
  return {
    payload: annotation,
    type: ADD_ANNOTATION,
  };
}

export function addExistingTemplate(
  templateId: number
): AddExistingTemplateAction {
  return {
    payload: templateId,
    type: ADD_EXISTING_TEMPLATE,
  };
}

export function clearTemplateDraft(): ClearTemplateDraftAction {
  return {
    type: CLEAR_TEMPLATE_DRAFT,
  };
}

export function createAnnotation(
  annotationRequest: CreateAnnotationRequest
): CreateAnnotationAction {
  return {
    payload: annotationRequest,
    type: CREATE_ANNOTATION,
  };
}

export function removeAnnotations(indexes: number[]): RemoveAnnotationsAction {
  return {
    payload: indexes,
    type: REMOVE_ANNOTATIONS,
  };
}

export function saveTemplate(): SaveTemplateAction {
  return {
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

export function updateTemplateDraft(
  draftUpdates: Partial<TemplateDraft>
): UpdateTemplateDraftAction {
  return {
    payload: draftUpdates,
    type: UPDATE_TEMPLATE_DRAFT,
  };
}

export function startTemplateDraft(
  original: Template,
  draft: TemplateDraft
): StartTemplateDraftAction {
  return {
    payload: {
      original,
      draft,
    },
    type: START_TEMPLATE_DRAFT,
  };
}

export function startTemplateDraftFailed(
  error: string
): StartTemplateDraftFailedAction {
  return {
    payload: error,
    type: START_TEMPLATE_DRAFT_FAILED,
  };
}
