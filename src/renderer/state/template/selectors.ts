import { isEmpty, trim, uniqBy } from "lodash";

import { createSelector } from "reselect";
import { LabkeyTemplate } from "../../util/labkey-client/types";
import {
    getAnnotationTypes,
    getNotesAnnotation,
    getTemplates,
    getWellAnnotation,
    getWorkflowAnnotation,
} from "../metadata/selectors";
import { State } from "../types";
import {
    Annotation,
    AnnotationDraft,
    AnnotationType,
    ColumnType,
    Template,
    TemplateDraft,
    TemplateWithTypeNames,
} from "./types";

export const getAppliedTemplate = (state: State) => state.template.present.appliedTemplate;
export const getCurrentTemplateIndex = (state: State) => state.template.index;
export const getTemplateDraft = (state: State) => state.template.present.draft;
export const getTemplateDraftName = (state: State) => state.template.present.draft.name;
export const getTemplateDraftAnnotations = (state: State) => state.template.present.draft.annotations;
export const getTemplatePast = (state: State) => state.template.past;

export const getTemplateDraftErrors = createSelector([
    getTemplates,
    getTemplateDraft,
    getTemplateDraftAnnotations,
    getTemplateDraftName,
], (
    allTemplates: LabkeyTemplate[],
    draft: TemplateDraft,
    annotations: AnnotationDraft[],
    templateName?: string) => {
    const errors = [];
    if (!trim(templateName)) {
        errors.push("Template is missing a name");
    }
    let annotationNameMissing = false;
    let annotationDescriptionMissing = false;
    annotations
        .forEach(({description, name, annotationOptions, annotationTypeId, annotationTypeName, lookupTable}) => {
            if (!trim(description)) {
                annotationDescriptionMissing = true;
            }

            if (!trim(name)) {
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
    if (annotationDescriptionMissing) {
        errors.push("At least one annotation is missing a description");
    }

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

    const notMostRecent = allTemplates.find(({ Name, Version }) =>
        Name === templateName && !!draft.version && Version > draft.version);
    if (draft.templateId && notMostRecent) {
        errors.push("Must edit the most recent version of a template");
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

            let annotationOptions: string[] | undefined = (a.annotationOptions || [])
                .map((o: string) => trim(o))
                .filter((o: string) => !!o);

            if (a.annotationTypeName !== ColumnType.DROPDOWN) {
                annotationOptions = undefined;
            }

            return {
                annotationOptions,
                annotationTypeId: a.annotationTypeId,
                canHaveManyValues: a.canHaveManyValues,
                description: trim(a.description) || "",
                lookupSchema: a.lookupSchema,
                lookupTable: a.lookupTable,
                name: trim(a.name) || "",
                required: a.required,
            };
        }),
        name: trim(draft.name) || "",
    };
});

// includes annotation info for required fields - wellIds, workflow
// and fills out annotation type name
export const getCompleteAppliedTemplate = createSelector([
    getNotesAnnotation,
    getWellAnnotation,
    getWorkflowAnnotation,
    getAppliedTemplate,
    getAnnotationTypes,
], (
    notes?: Annotation,
    well?: Annotation,
    workflow?: Annotation,
    appliedTemplate?: Template,
    annotationTypes?: AnnotationType[]
): TemplateWithTypeNames | undefined => {
    if (!appliedTemplate) {
        return undefined;
    }

    if (!well || !workflow || !notes) {
        throw new Error("Could not get well, workflow, or notes annotation");
    }

    if (!annotationTypes) {
        throw new Error("Missing Annotation Types");
    }

    return {
        ...appliedTemplate,
        annotations: [
            ...appliedTemplate.annotations.map((a) => {
                const type = annotationTypes.find((at) => at.annotationTypeId === a.annotationTypeId);
                if (!type) {
                    throw new Error(`Could not find annotation type matching annotationTypeId=${a.annotationTypeId}`);
                }
                return {
                    ...a,
                    type: type.name,
                };
            }),
            {
                ...well,
                canHaveManyValues: true,
                // Renaming because it the annotation name doesn't match the property in UploadMetadata
                // In the future we should think about renaming the property
                name: "Well Ids",
                required: false,
                type: ColumnType.LOOKUP,
            },
            {
                ...workflow,
                canHaveManyValues: true,
                // Renaming because it the annotation name doesn't match the property in UploadMetadata
                // In the future we should think about renaming the property
                name: "Workflows",
                required: false,
                type: ColumnType.LOOKUP,
            },
            {
                ...notes,
                canHaveManyValues: false,
                required: false,
                type: ColumnType.TEXT,
            },
        ],
    };
});
