import {
    CLEAR_TEMPLATE_DRAFT,
    GET_TEMPLATE,
    SAVE_TEMPLATE,
    UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import {
    ClearTemplateDraftAction,
    GetTemplateAction,
    SaveTemplateAction,
    TemplateDraft,
    UpdateTemplateDraftAction,
} from "./types";

export function clearTemplateDraft(): ClearTemplateDraftAction {
    return {
        type: CLEAR_TEMPLATE_DRAFT,
    };
}

export function getTemplate(templateId: number, editTemplate: boolean = false): GetTemplateAction {
    return {
        payload: {
            editTemplate,
            templateId,
        },
        type: GET_TEMPLATE,
    };
}

export function saveTemplate(templateId?: number): SaveTemplateAction {
    return {
        payload: templateId,
        type: SAVE_TEMPLATE,
    };
}

export function updateTemplateDraft(draft: TemplateDraft): UpdateTemplateDraftAction {
    return {
        payload: draft,
        type: UPDATE_TEMPLATE_DRAFT,
    };
}
