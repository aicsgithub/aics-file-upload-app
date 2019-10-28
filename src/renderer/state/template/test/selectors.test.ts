import { expect } from "chai";

import {
    getMockStateWithHistory,
    mockAnnotationDraft,
    mockState,
    mockTemplateDraft,
    mockTemplateStateBranch,
} from "../../test/mocks";

import { getTemplateDraftErrors } from "../selectors";
import { ColumnType } from "../types";

describe("Template selectors", () => {
    describe("getTemplateDraftErrors", () => {
        it("returns empty error array if no errors", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                    },
                }),
            });
            expect(result.length).to.equal(0);
        });
        it("adds error if draft is missing a name", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                        name: undefined,
                    },
                }),
            });
            expect(result).to.contain("Template is missing a name");
        });
        it("adds error if an annotation is missing a name", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                        annotations: [{
                            ...mockAnnotationDraft,
                            name: undefined,
                        }],
                    },
                }),
            });
            expect(result).to.contain("At least one annotation is missing a name");
        });
        it("adds error if annotation is a dropdown but does not have options", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                        annotations: [{
                            ...mockAnnotationDraft,
                            annotationTypeId: 4,
                            annotationTypeName: ColumnType.DROPDOWN,
                        }],
                    },
                }),
            });
            expect(result).to.contain("Annotation Color is a dropdown but is missing dropdown options");
        });
        it("adds error if annotation is a lookup but does not have a lookup table", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                        annotations: [{
                            ...mockAnnotationDraft,
                            annotationTypeId: 3,
                            annotationTypeName: ColumnType.LOOKUP,
                        }],
                    },
                }),
            });
            expect(result).to.contain("Annotation Color is a lookup but no lookup table is specified");
        });
        it("adds error if there are no annotations", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                        annotations: [],
                    },
                }),
            });
            expect(result).to.contain("Templates need at least one annotation");
        });
        it("adds error if duplicate names found", () => {
            const result = getTemplateDraftErrors({
                ...mockState,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    draft: {
                        ...mockTemplateDraft,
                        annotations: [mockAnnotationDraft, mockAnnotationDraft],
                    },
                }),
            });
            expect(result).to.contain("Found duplicate annotation names");
        });
    });
});
