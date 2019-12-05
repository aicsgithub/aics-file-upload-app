import { expect } from "chai";
import { ColumnType } from "../../template/types";
import {
    mockAuditInfo,
    mockNotesAnnotation,
    mockSearchResults,
    mockSearchResultsAsTable,
    mockState,
    mockWellAnnotation,
    mockWorkflowAnnotation,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
    getAnnotationsWithAnnotationOptions,
    getBooleanAnnotationTypeId,
    getLookupAnnotationTypeId,
    getNotesAnnotation,
    getNumberOfFiles,
    getSearchResultsAsTable,
    getUniqueBarcodeSearchResults,
    getWellAnnotation,
    getWorkflowAnnotation,
} from "../selectors";

describe("Metadata selectors", () => {
    describe("getUniqueBarcodeSearchResults", () => {
        it("groups by barcode and combines imagingSessionIds", () => {
            const barcode1 = "barcode1";
            const barcode2 = "barcode2";
            const barcodeSearchResults = [
                {
                    barcode: barcode1,
                    imagingSessionId: 1,
                },
                {
                    barcode: barcode2,
                    imagingSessionId: null,
                },
                {
                    barcode: barcode1,
                    imagingSessionId: 2,
                },
            ];
            const results = getUniqueBarcodeSearchResults({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    barcodeSearchResults,
                },
            });

            expect(results.length).to.equal(2);
            expect(results).to.deep.include({
                barcode: barcode1,
                imagingSessionIds: [1, 2],
            });
            expect(results).to.deep.include({
                barcode: barcode2,
                imagingSessionIds: [null],
            });
        });
    });

    describe("getBooleanAnnotationTypeId", () => {
        it("returns id for annotation type with name matching BOOLEAN if found", () => {
            const result = getBooleanAnnotationTypeId({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: [
                        {annotationTypeId: 1, name: ColumnType.TEXT},
                        {annotationTypeId: 2, name: ColumnType.BOOLEAN},
                    ],
                },
            });
            expect(result).to.equal(2);
        });
        it("returns undefined if no annotation type has name matching BOOLEAN", () => {
            const result = getBooleanAnnotationTypeId({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: [
                        {annotationTypeId: 1, name: ColumnType.TEXT},
                        {annotationTypeId: 2, name: ColumnType.LOOKUP},
                    ],
                },
            });
            expect(result).to.equal(undefined);
        });
    });

    describe("getLookupAnnotationTypeId", () => {
        it("returns id for annotation type with name matching LOOKUP if found", () => {
            const result = getLookupAnnotationTypeId({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: [
                        {annotationTypeId: 1, name: ColumnType.TEXT},
                        {annotationTypeId: 2, name: ColumnType.LOOKUP},
                    ],
                },
            });
            expect(result).to.equal(2);
        });
        it("returns undefined if no annotation type has name matching LOOKUP", () => {
            const result = getLookupAnnotationTypeId({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: [
                        {annotationTypeId: 1, name: ColumnType.TEXT},
                        {annotationTypeId: 2, name: ColumnType.BOOLEAN},
                    ],
                },
            });
            expect(result).to.equal(undefined);
        });
    });
    describe("getNotesAnnotation", () => {
        it("returns annotation named Notes if found", () => {
            const result = getNotesAnnotation(nonEmptyStateForInitiatingUpload);
            expect(result).to.equal(mockNotesAnnotation);
        });
        it("returns undefined if Notes annotation not found", () => {
            const result = getNotesAnnotation(mockState);
            expect(result).to.be.undefined;
        });
    });
    describe("getWellAnnotation", () => {
        it("returns annotation named Well if found", () => {
            const result = getWellAnnotation(nonEmptyStateForInitiatingUpload);
            expect(result).to.equal(mockWellAnnotation);
        });
        it("returns undefined if Well annotation not found", () => {
            const result = getWellAnnotation(mockState);
            expect(result).to.be.undefined;
        });
    });
    describe("getWorkflowAnnotation", () => {
        it("returns annotation named Workflow if found", () => {
            const result = getWorkflowAnnotation(nonEmptyStateForInitiatingUpload);
            expect(result).to.equal(mockWorkflowAnnotation);
        });
        it("returns undefined if Workflow annotation not found", () => {
            const result = getWorkflowAnnotation(mockState);
            expect(result).to.be.undefined;
        });
    });
    describe("getSearchResultsAsTable", () => {
        it("returns searchResultsAsTable if searchResults exist", () => {
            const result = getSearchResultsAsTable({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    fileMetadataSearchResults: mockSearchResults,
                },
            });
            expect(result).to.deep.equal(mockSearchResultsAsTable);
        });
        it("returns undefined if searchResults don't exist", () => {
            const result = getSearchResultsAsTable(mockState);
            expect(result).to.be.undefined;
        });
    });
    describe("getAnnotationsWithAnnotationOptions", () => {
        const mockAnnotation = {
            ...mockAuditInfo,
            annotationId: 2,
            annotationTypeId: 3,
            description: "",
            name: "Dropdown",
        };
        const mockAnnotation2 = {
            ...mockAnnotation,
            annotationId: 3,
        };
        it("adds annotation options to matching annotation if found", () => {
            const result = getAnnotationsWithAnnotationOptions({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationOptions: [
                        {
                            annotationId: mockAnnotation.annotationId,
                            annotationOptionId: 1,
                            value: "a",
                        },
                        {
                            annotationId: mockAnnotation.annotationId,
                            annotationOptionId: 1,
                            value: "b",
                        },
                    ],
                    annotations: [mockAnnotation, mockAnnotation2],
                },
            });
            expect(result).to.deep.equal([
                {
                    ...mockAnnotation,
                    annotationOptions: ["a", "b"],
                },
                {
                    ...mockAnnotation2,
                    annotationOptions: undefined,
                },
            ]);
        });
    });

    describe("getNumberOfFiles", () => {
        it("returns 0 if nothing match search", () => {
            const result = getNumberOfFiles(mockState);
            expect(result).to.equal(0);
        });

        it("returns correct number of files if files match search", () => {
            const result = getNumberOfFiles({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    fileMetadataSearchResults: mockSearchResults,
                },
            });
            expect(result).to.equal(1);
        });
    });
});
