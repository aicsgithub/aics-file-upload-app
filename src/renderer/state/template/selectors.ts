import { isEmpty, uniqBy } from "lodash";

import { createSelector } from "reselect";
import { getNotesAnnotation, getWellAnnotation, getWorkflowAnnotation } from "../metadata/selectors";
import { State } from "../types";
import { Annotation, AnnotationDraft, ColumnType, Template, TemplateDraft } from "./types";

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

export const getSaveTemplateRequest = createSelector([
    getTemplateDraft,
], (draft: TemplateDraft) => {
    return {
        annotations: draft.annotations.map((a: AnnotationDraft) => {
            if (a.annotationId) {
                return {
                    annotationId: a.annotationId,
                    canHaveManyValues: a.canHaveManyValues,
                    required: a.required,
                };
            }

            let annotationOptions = a.annotationOptions;
            if (a.annotationTypeName === ColumnType.LOOKUP) {
                annotationOptions = undefined;
            }

            return {
                annotationOptions,
                annotationTypeId: a.annotationTypeId,
                canHaveManyValues: a.canHaveManyValues,
                description: a.description || "",
                lookupSchema: a.lookupSchema,
                lookupTable: a.lookupTable,
                name: a.name || "",
                required: a.required,
            };
        }),
        name: draft.name || "",
    };
});

// includes annotation info for required fields - wellIds, workflow
export const getCompleteAppliedTemplate = createSelector([
    getNotesAnnotation,
    getWellAnnotation,
    getWorkflowAnnotation,
    getAppliedTemplate,
], (
    notes?: Annotation,
    well?: Annotation,
    workflow?: Annotation,
    appliedTemplate?: Template
): Template | undefined => {
    if (!appliedTemplate) {
        return undefined;
    }

    if (!well || !workflow || !notes) {
        throw new Error("Could not get well, workflow, or notes annotation");
    }

    return {
        ...appliedTemplate,
        annotations: [
            ...appliedTemplate.annotations,
            {
                ...well,
                canHaveManyValues: true,
                // Renaming because it the annotation name doesn't match the property in UploadMetadata
                // In the future we should think about renaming the property
                name: "Well Ids",
                required: false,
            },
            {
                ...workflow,
                canHaveManyValues: true,
                // Renaming because it the annotation name doesn't match the property in UploadMetadata
                // In the future we should think about renaming the property
                name: "Workflows",
                required: false,
            },
            {
                ...notes,
                canHaveManyValues: true,
                required: true,
            },
        ],
    };
});
