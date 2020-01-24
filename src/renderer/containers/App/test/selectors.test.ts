import { expect } from "chai";
import { get } from "lodash";

import { getMockStateWithHistory, mockSelection, mockState, mockWells } from "../../../state/test/mocks";
import { getFileToTags } from "../selectors";

describe("App selectors", () => {
    describe("getFileToTags", () => {
        it("creates human readable info from wells", () => {
            const filePath1 = "filepath1";
            const filePath2 = "filepath2";
            const map = getFileToTags({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: mockWells,
                }),
                upload: getMockStateWithHistory({
                    [filePath1]: {
                        barcode: "test_barcode",
                        file: filePath1,
                        shouldBeInArchive: true,
                        shouldBeInLocal: true,
                        wellIds: [1, 3],
                        wellLabels: ["A1", "B1"],
                    },
                    [filePath2]: {
                        barcode: "test_barcode",
                        file: filePath2,
                        shouldBeInArchive: false,
                        shouldBeInLocal: false,
                        wellIds: [4],
                        wellLabels: ["A4"],
                    },
                }),
            });

            const file1Tags = map.get(filePath1) || [];
            expect(file1Tags.length).to.equal(4);
            expect(file1Tags.map((t) => t.title)).to.contain("A1");
            expect(file1Tags.map((t) => t.title)).to.contain("B1");
            expect(file1Tags.map((t) => t.title)).to.contain("Isilon");
            expect(file1Tags.map((t) => t.title)).to.contain("Archive");

            const file2Tags = map.get(filePath2) || [];
            expect(file2Tags.length).to.equal(1);
            expect(get(file2Tags, [0, "title"])).to.equal("A4");

            expect(get(file1Tags, [0, "color"])).to.equal(get(file2Tags, [0, "color"]));
        });

        it("creates human readable info from workflows", () => {
            const filePath1 = "filepath1";
            const filePath2 = "filepath2";
            const map = getFileToTags({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: mockWells,
                }),
                upload: getMockStateWithHistory({
                    [filePath1]: {
                        barcode: "test_barcode",
                        file: filePath1,
                        wellIds: [],
                        wellLabels: [],
                        workflows: [
                            "work3",
                            "work4",
                        ],
                    },
                    [filePath2]: {
                        barcode: "test_barcode",
                        file: filePath2,
                        wellIds: [],
                        wellLabels: [],
                        workflows: [
                            "work2",
                        ]},
                }),
            });

            const file1Tags = map.get(filePath1) || [];
            expect(file1Tags.length).to.equal(2);
            expect(get(file1Tags, [0, "title"])).to.equal("work3");
            expect(get(file1Tags, [1, "title"])).to.equal("work4");

            const file2Tags = map.get(filePath2) || [];
            expect(file2Tags.length).to.equal(1);
            expect(get(file2Tags, [0, "title"])).to.equal("work2");

            expect(get(file1Tags, [0, "color"])).to.equal(get(file2Tags, [0, "color"]));
        });
    });
});
