import { UploadStateBranch } from "../upload/types";

import {
  ADD_ANNOTATION,
  CLEAR_TEMPLATE_DRAFT,
  CLEAR_TEMPLATE_HISTORY,
  JUMP_TO_PAST_TEMPLATE,
  REMOVE_ANNOTATIONS,
  SAVE_TEMPLATE,
  SET_APPLIED_TEMPLATE,
  START_TEMPLATE_DRAFT,
  START_TEMPLATE_DRAFT_FAILED,
  UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import {
  AddExistingAnnotationAction,
  Annotation,
  ClearTemplateDraftAction,
  ClearTemplateHistoryAction,
  JumpToPastTemplateAction,
  RemoveAnnotationsAction,
  SaveTemplateAction,
  SetAppliedTemplateAction,
  StartTemplateDraftAction,
  StartTemplateDraftFailedAction,
  Template,
  TemplateDraft,
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

export function clearTemplateDraft(): ClearTemplateDraftAction {
  return {
    type: CLEAR_TEMPLATE_DRAFT,
  };
}

export function clearTemplateHistory(): ClearTemplateHistoryAction {
  return {
    type: CLEAR_TEMPLATE_HISTORY,
  };
}

export function jumpToPastTemplate(index: number): JumpToPastTemplateAction {
  return {
    index,
    type: JUMP_TO_PAST_TEMPLATE,
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
  draft: TemplateDraft,
  originalHasBeenUsed: boolean
): StartTemplateDraftAction {
  return {
    payload: {
      original,
      draft,
      originalTemplateHasBeenUsed: originalHasBeenUsed,
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
