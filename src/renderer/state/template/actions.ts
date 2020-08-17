import { PREFERRED_TEMPLATE_ID } from "../../../shared/constants";
import { Annotation } from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import { TemplateDraft, UploadStateBranch } from "../types";

import {
  ADD_ANNOTATION,
  CLEAR_TEMPLATE_DRAFT,
  CLEAR_TEMPLATE_HISTORY,
  JUMP_TO_PAST_TEMPLATE,
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
  ClearTemplateDraftAction,
  ClearTemplateHistoryAction,
  JumpToPastTemplateAction,
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
