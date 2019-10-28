import {
    ADD_ANNOTATION,
    CLEAR_TEMPLATE_DRAFT,
    GET_TEMPLATE,
    REMOVE_ANNOTATIONS,
    SAVE_TEMPLATE, SET_APPLIED_TEMPLATE,
    UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import {
    AddExistingAnnotationAction,
    Annotation,
    ClearTemplateDraftAction,
    GetTemplateAction,
    RemoveAnnotationsAction,
    SaveTemplateAction, SetAppliedTemplateAction, Template,
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

export function getTemplate(templateId: number, addAnnotationsToUpload: boolean = false): GetTemplateAction {
    return {
        payload: {
            addAnnotationsToUpload,
            templateId,
        },
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

export function setAppliedTemplate(template: Template): SetAppliedTemplateAction {
    return {
        payload: template,
        type: SET_APPLIED_TEMPLATE,
    };
}

export function updateTemplateDraft(draft: TemplateDraft): UpdateTemplateDraftAction {
    return {
        payload: draft,
        type: UPDATE_TEMPLATE_DRAFT,
    };
}
