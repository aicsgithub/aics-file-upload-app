import { trim } from "lodash";
import { createSelector } from "reselect";

import { AnnotationName } from "../../constants";
import {
  Annotation,
  AnnotationType,
  ColumnType,
} from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import {
  getAnnotations,
  getAnnotationTypes,
  getUserIdToDisplayNameMap,
} from "../metadata/selectors";
import { AnnotationDraft, State, TemplateDraft } from "../types";

import { TemplateWithTypeNames } from "./types";

export const getAppliedTemplate = (state: State) =>
  state.template.appliedTemplate;
export const getTemplateDraft = (state: State) => state.template.draft;
export const getOriginalTemplate = (state: State) => state.template.original;

export const getTemplateDraftWithAuditInfo = createSelector(
  [getTemplateDraft, getUserIdToDisplayNameMap],
  (draft, userIdToDisplayName) => ({
    ...draft,
    annotations: draft.annotations.map((a) => ({
      ...a,
      added: "",
      addedBy: userIdToDisplayName[draft.createdBy],
      createdByDisplayName: userIdToDisplayName[a.createdBy],
      modifiedByDisplayName: userIdToDisplayName[a.modifiedBy],
    })),
    createdByDisplayName: userIdToDisplayName[draft.createdBy],
    modifiedByDisplayName: userIdToDisplayName[draft.modifiedBy],
  })
);

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
const DEFAULT_ANNOTATION_NAMES = [AnnotationName.NOTES, AnnotationName.WELL];
export const getCompleteAppliedTemplate = createSelector(
  [getAnnotations, getAnnotationTypes, getAppliedTemplate],
  (
    annotations: Annotation[],
    annotationTypes: AnnotationType[],
    appliedTemplate?: Template
  ): TemplateWithTypeNames | undefined => {
    if (!appliedTemplate) {
      return undefined;
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
        ...DEFAULT_ANNOTATION_NAMES.map((name) => {
          const annotation = annotations.find((a) => a.name === name);
          if (!annotation) {
            throw new Error("Could not get necessary annotation information");
          }
          return {
            ...annotation,
            required: false,
            type: annotation["annotationTypeId/Name"],
          };
        }),
      ],
    };
  }
);
