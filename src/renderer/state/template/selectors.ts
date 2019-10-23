import { isEmpty, uniqBy } from "lodash";

import { createSelector } from "reselect";
import { State } from "../types";
import { AnnotationDraft, ColumnType } from "./types";

export const getTemplateDraft = (state: State) => state.template.present.draft;
export const getTemplateDraftAnnotations = (state: State) => state.template.present.draft.annotations;

export const getCanSaveTemplate = createSelector([
    getTemplateDraftAnnotations,
], (annotations: AnnotationDraft[]) => {
    const columnWithNoTypeFound: boolean = !!annotations.find(({type}) => !type || !type.annotationTypeId);
    const duplicateNamesFound: boolean = uniqBy(
        annotations.filter((c: AnnotationDraft) => !!c.name),
        "name"
    ).length !== annotations.length;
    const columnWithNoLabelFound: boolean = !!annotations.find(({name}) => !name);
    const dropdownValuesMissing: boolean = !!annotations
        .find(({type}) => type.name === ColumnType.DROPDOWN && isEmpty(type.annotationOptions));
    const lookupValuesMissing: boolean = !!annotations
        .find(({type}) => type.name === ColumnType.LOOKUP && !type.lookupTable);

    return !duplicateNamesFound &&
        !columnWithNoLabelFound &&
        !dropdownValuesMissing &&
        !columnWithNoTypeFound &&
        !lookupValuesMissing;
});
