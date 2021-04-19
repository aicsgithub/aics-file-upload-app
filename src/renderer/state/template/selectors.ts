import { trim } from "lodash";
import { createSelector } from "reselect";

import {
  Annotation,
  AnnotationType,
  ColumnType,
} from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import {
  getAnnotationTypes,
  getNotesAnnotation,
  getWellAnnotation,
} from "../metadata/selectors";
import { AnnotationDraft, State, TemplateDraft } from "../types";

import { TemplateWithTypeNames } from "./types";

export const getAppliedTemplate = (state: State) =>
  state.template.appliedTemplate;
export const getTemplateDraft = (state: State) => state.template.draft;
export const getOriginalTemplate = (state: State) => state.template.original;

export const getSaveTemplateRequest = createSelector(
  [getTemplateDraft],
  (draft: TemplateDraft) => {
    return {
      annotations: draft.annotations.map((a: AnnotationDraft) => {
        let annotationOptions: string[] | undefined = (
          a.annotationOptions || []
        )
          .map((o: string) => trim(o))
          .filter((o: string) => !!o);

        if (a.annotationTypeName !== ColumnType.DROPDOWN) {
          annotationOptions = undefined;
        }

        if (a.annotationId) {
          return {
            annotationId: a.annotationId,
            annotationOptions,
            // TODO lisah 5/7/20 this should be removed as part of FMS-1176
            canHaveManyValues: true,
            required: a.required,
          };
        }

        return {
          annotationOptions,
          annotationTypeId: a.annotationTypeId,
          // TODO lisah 5/7/20 this should be removed as part of FMS-1176
          canHaveManyValues: true,
          description: trim(a.description) || "",
          lookupSchema: a.lookupSchema,
          lookupTable: a.lookupTable,
          name: trim(a.name) || "",
          required: a.required,
        };
      }),
      name: trim(draft.name) || "",
    };
  }
);

// includes annotation info for required fields - well
// and fills out annotation type name
export const getCompleteAppliedTemplate = createSelector(
  [
    getNotesAnnotation,
    getWellAnnotation,
    getAppliedTemplate,
    getAnnotationTypes,
  ],
  (
    notes?: Annotation,
    well?: Annotation,
    appliedTemplate?: Template,
    annotationTypes?: AnnotationType[]
  ): TemplateWithTypeNames | undefined => {
    if (!appliedTemplate) {
      return undefined;
    }

    if (!well || !notes) {
      throw new Error("Could not get well or notes annotation");
    }

    if (!annotationTypes) {
      throw new Error("Missing Annotation Types");
    }

    return {
      ...appliedTemplate,
      annotations: [
        ...appliedTemplate.annotations.map((a) => {
          const type = annotationTypes.find(
            (at) => at.annotationTypeId === a.annotationTypeId
          );
          if (!type) {
            throw new Error(
              `Could not find annotation type matching annotationTypeId=${a.annotationTypeId}`
            );
          }
          return {
            ...a,
            type: type.name,
          };
        }),
        {
          ...well,
          required: false,
          type: ColumnType.LOOKUP,
        },
        {
          ...notes,
          required: false,
          type: ColumnType.TEXT,
        },
      ],
    };
  }
);
