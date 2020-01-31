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
                    },
                    [filePath2]: {
                        barcode: "test_barcode",
                        file: filePath2,
                        shouldBeInArchive: false,
                        shouldBeInLocal: false,
                        wellIds: [4],
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
            expect(get(file2Tags, [0, "title"])).to.equal("B2");

            expect(get(file1Tags, [0, "color"])).to.equal(get(file2Tags, [0, "color"]));
        });

        it ("adds imaging session name if well was from another imaging session", () => {
            const filePath1 = "filepath1";
            const map = getFileToTags({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    imagingSessions: [{
                        description: "2 hours after plated",
                        imagingSessionId: 1,
                        name: "2 hours",
                    }],
                },
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    wells: mockWells,
                }),
                upload: getMockStateWithHistory({
                    [filePath1]: {
                        barcode: "test_barcode",
                        file: filePath1,
                        wellIds: [10],
                    },
                }),
            });

            const file1ToTags = map.get(filePath1) || [];
            expect(file1ToTags.length).to.equal(1);
            expect(file1ToTags.map((t) => t.title)).to.contain("A1 (2 hours)");
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
                        workflows: [
                            "work3",
                            "work4",
                        ],
                    },
                    [filePath2]: {
                        barcode: "test_barcode",
                        file: filePath2,
                        wellIds: [],
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
