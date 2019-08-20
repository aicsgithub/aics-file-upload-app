import { expect } from "chai";
import { difference, keys } from "lodash";

import {
    getMockStateWithHistory,
    mockSelectedWells,
    mockSelection,
    mockState,
    mockWells,
} from "../../../state/test/mocks";
import { getMutualFilesForWells, getWellIdToFiles } from "../selectors";

describe("AssociateWells selectors", () => {
    describe("getMutualFiles", () => {
        it("returns file paths that are shared by the selected wells", () => {
            const arr = getMutualFilesForWells({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWells: mockSelectedWells.slice(0, 3),
                    wells: mockWells,
                }),
            });
            expect(arr[0]).to.equal("/path/to/file3");
            expect(arr.length).to.equal(1);
        });

        it("returns an empty array if no selected wells", () => {
            const arr = getMutualFilesForWells({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWells: [],
                }),
            });
            expect(arr).to.be.empty;
        });

        it("returns an empty array if no mutual files", () => {
            const arr = getMutualFilesForWells({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWells: mockSelectedWells,
                }),
            });
            expect(arr).to.be.empty;
        });
    });
    describe("getWellIdToFiles", () => {
        it("returns an empty map given no uploads", () => {
            const map = getWellIdToFiles({
                ...mockState,
                upload: getMockStateWithHistory({}),
            });

            expect(keys(map).length).to.equal(0);
        });

        it("aggregates all files associated with a well given multiple files", () => {
            const barcode = "test_barcode";
            const wellId = 2;
            const wellLabel = "A1";
            const wellId2 = 5;
            const wellLabel2 = "A5";
            const map = getWellIdToFiles({
                ...mockState,
                upload: getMockStateWithHistory({
                    "/path1": {barcode, wellIds: [wellId], wellLabels: [wellLabel]},
                    "/path2": {barcode, wellIds: [wellId], wellLabels: [wellLabel]},
                    "/path3": {barcode, wellIds: [wellId], wellLabels: [wellLabel]},
                    "/path4": {barcode, wellIds: [wellId2], wellLabels: [wellLabel2]},
                }),
            });

            expect(keys(map).length).to.equal(2);
            const filesForWell1 = map[wellId];
            expect(filesForWell1).to.not.be.undefined;

            if (filesForWell1) {

                expect(difference(filesForWell1, ["/path1", "/path2", "/path3"]).length).to.equal(0);
            }

            const filesForWell2 = map[wellId2];
            expect(filesForWell2).to.not.be.undefined;

            if (filesForWell2) {
                expect(difference(filesForWell2, ["/path4"]).length).to.equal(0);
            }
        });
    });
});
