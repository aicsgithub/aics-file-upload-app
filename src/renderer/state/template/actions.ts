import { CREATE_TEMPLATE, EDIT_TEMPLATE, GET_TEMPLATE, SAVE_TEMPLATE, UPDATE_TEMPLATE_DRAFT } from "./constants";
import {
    CreateTemplateAction,
    CreateTemplateRequest,
    EditTemplateAction, GetTemplateAction, SaveTemplateAction,
    Template, TemplateDraft, UpdateTemplateDraftAction,
} from "./types";

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
