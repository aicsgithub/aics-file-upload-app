import { isEmpty, uniqBy } from "lodash";

import { createSelector } from "reselect";
import { State } from "../types";
import { AnnotationDraft, ColumnType } from "./types";

export const getAppliedTemplate = (state: State) => state.template.present.appliedTemplate;
export const getTemplateDraft = (state: State) => state.template.present.draft;
export const getTemplateDraftName = (state: State) => state.template.present.draft.name;
export const getTemplateDraftAnnotations = (state: State) => state.template.present.draft.annotations;

export const getTemplateDraftErrors = createSelector([
    getTemplateDraftAnnotations,
    getTemplateDraftName,
], (annotations: AnnotationDraft[], templateName?: string) => {
    const errors = [];
    if (!templateName) {
        errors.push("Template is missing a name");
    }
    let annotationNameMissing = false;

    annotations
        .forEach(({name, annotationOptions, annotationTypeId, annotationTypeName, lookupTable}) => {
            if (!name) {
                annotationNameMissing = true;
            }

            if (!annotationTypeId) {
                errors.push(`Annotation ${name} is missing a data type`);
            }

            if (annotationTypeName === ColumnType.DROPDOWN && isEmpty(annotationOptions)) {
                errors.push(`Annotation ${name} is a dropdown but is missing dropdown options`);
            }

            if (annotationTypeName === ColumnType.LOOKUP && !lookupTable) {
                errors.push(`Annotation ${name} is a lookup but no lookup table is specified`);
            }
        });
    if (annotationNameMissing) {
        errors.push("At least one annotation is missing a name");
    }

    if (isEmpty(annotations)) {
        errors.push("Templates need at least one annotation");
    }

    const duplicateNamesFound: boolean = uniqBy(
        annotations.filter((c: AnnotationDraft) => !!c.name),
        "name"
    ).length !== annotations.length;

    if (duplicateNamesFound) {
        errors.push("Found duplicate annotation names");
    }

    return errors;
});
