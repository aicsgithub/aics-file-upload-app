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
import { State } from "../types";

import { TemplateWithTypeNames } from "./types";

export const getAppliedTemplate = (state: State) =>
  state.template.appliedTemplate;

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
