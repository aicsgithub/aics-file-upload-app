import { CREATE_TEMPLATE, EDIT_TEMPLATE, GET_ANNOTATIONS } from "./constants";

export function getAllAnnotations(): GetAnnotationsAction {
    return {
        type: GET_ANNOTATIONS,
    };
}

export function createTemplate(template: CreateTemplateRequest): CreateTemplateAction {
    return {
        template,
        type: CREATE_TEMPLATE,
    };
}

export function editTemplate(template: Template): EditTemplateAction {
    return {
        template,
        type: EDIT_TEMPLATE,
    };
}
