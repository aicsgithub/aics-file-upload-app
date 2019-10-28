import { expect } from "chai";
import { ColumnType } from "../../template/types";
import { mockState } from "../../test/mocks";
import { getBooleanAnnotationTypeId, getLookupAnnotationTypeId, getUniqueBarcodeSearchResults } from "../selectors";

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
});
