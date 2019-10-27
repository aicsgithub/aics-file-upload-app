import {
    ADD_ANNOTATION,
    CLEAR_TEMPLATE_DRAFT,
    GET_TEMPLATE,
    REMOVE_ANNOTATIONS,
    SAVE_TEMPLATE,
    UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import {
    AddExistingAnnotationAction,
    Annotation,
    ClearTemplateDraftAction,
    GetTemplateAction,
    RemoveAnnotationsAction,
    SaveTemplateAction,
    TemplateDraft,
    UpdateTemplateDraftAction,
} from "./types";

export function addExistingAnnotation(annotation: Annotation): AddExistingAnnotationAction {
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

export function getTemplate(templateId: number): GetTemplateAction {
    return {
        payload: templateId,
        type: GET_TEMPLATE,
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

export function updateTemplateDraft(draft: TemplateDraft): UpdateTemplateDraftAction {
    return {
        payload: draft,
        type: UPDATE_TEMPLATE_DRAFT,
    };
}
