import { expect } from "chai";
import { mockState } from "../../test/mocks";
import { getUniqueBarcodeSearchResults } from "../selectors";

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
