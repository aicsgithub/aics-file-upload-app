import { expect } from "chai";
import { get } from "lodash";

import { getMockStateWithHistory, mockSelection, mockState, mockWells } from "../../../state/test/mocks";
import { getFileToTags } from "../selectors";

describe("App selectors", () => {
    describe("getFileToTags", () => {
        it("creates human readable info from upload", () => {
            const filePath1 = "filepath1";
            const filePath2 = "filepath2";
            const map = getFileToTags({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: mockWells,
                }),
                upload: getMockStateWithHistory({
                    [filePath1]: { barcode: "test_barcode", wellIds: [1, 3], wellLabels: ["A1", "A3"]},
                    [filePath2]: { barcode: "test_barcode", wellIds: [4], wellLabels: ["A4"]},
                }),
            });

            const file1Tags = map.get(filePath1) || [];
            expect(file1Tags.length).to.equal(1);
            expect(get(file1Tags, [0, "title"])).to.equal("A1");

            const file2Tags = map.get(filePath2) || [];
            expect(file2Tags.length).to.equal(1);
            expect(get(file2Tags, [0, "title"])).to.equal("B2");

            expect(get(file1Tags, [0, "color"])).to.equal(get(file2Tags, [0, "color"]));
        });
    });
});
