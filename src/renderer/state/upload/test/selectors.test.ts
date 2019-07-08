import { expect } from "chai";
import { difference } from "lodash";

import { getMockStateWithHistory, mockState } from "../../test/mocks";
import { State } from "../../types";

import { getUploadPayload, getWellIdToFiles } from "../selectors";
import { FileType } from "../types";

describe("Upload selectors", () => {
    describe("getWellIdToFiles", () => {
        it("returns an empty map given no uploads", () => {
           const map = getWellIdToFiles({
               ...mockState,
               upload: getMockStateWithHistory({}),
           });

           expect(map.size).to.equal(0);
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

            expect(map.size).to.equal(2);
            const filesForWell1 = map.get(wellId);
            expect(filesForWell1).to.not.be.undefined;

            if (filesForWell1) {

                expect(difference(filesForWell1, ["/path1", "/path2", "/path3"]).length).to.equal(0);
            }

            const filesForWell2 = map.get(wellId2);
            expect(filesForWell2).to.not.be.undefined;

            if (filesForWell2) {
                expect(difference(filesForWell2, ["/path4"]).length).to.equal(0);
            }
        });
    });

    describe("getUploadPayload", () => {
        it("Adds correct file type and moves wellId to microscopy section", () => {
            const state: State = {
                ...mockState,
                upload: getMockStateWithHistory({
                    "/path/to.dot/image.tiff": {
                        barcode: "452",
                        plateId: 4,
                        wellIds: [6],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.czi": {
                        barcode: "567",
                        plateId: 4,
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.ome.tiff": {
                        barcode: "123",
                        plateId: 2,
                        wellIds: [2],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.png": {
                        barcode: "345",
                        plateId: 5,
                        wellIds: [3],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.tiff": {
                        barcode: "234",
                        plateId: 3,
                        wellIds: [4],
                        wellLabels: ["A1"],
                    },
                    "/path/to/multi-well.txt": {
                        barcode: "456",
                        plateId: 7,
                        wellIds: [5, 6, 7],
                        wellLabels: ["A1", "A2", "A3"],
                    },
                    "/path/to/no-extension": {
                        barcode: "888",
                        plateId: 7,
                        wellIds: [7],
                        wellLabels: ["A1"],
                    },
                    "/path/to/not-image.csv": {
                        barcode: "578",
                        plateId: 7,
                        wellIds: [8],
                        wellLabels: ["A1"],
                    },
                    "/path/to/not-image.txt": {
                        barcode: "456",
                        plateId: 7,
                        wellIds: [5],
                        wellLabels: ["A1"],
                    },
                }),
            };
            const expected = {
                "/path/to.dot/image.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellIds: [6],
                    },
                },
                "/path/to/image.czi": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellIds: [1],
                    },
                },
                "/path/to/image.ome.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellIds: [2],
                    },
                },
                "/path/to/image.png": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellIds: [3],
                    },
                },
                "/path/to/image.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellIds: [4],
                    },
                },
                "/path/to/multi-well.txt": {
                    file: {
                        fileType: FileType.TEXT,
                    },
                    microscopy: {
                        wellIds: [5, 6, 7],
                    },
                },
                "/path/to/no-extension": {
                    file: {
                        fileType: FileType.OTHER,
                    },
                    microscopy: {
                        wellIds: [7],
                    },
                },
                "/path/to/not-image.csv": {
                    file: {
                        fileType: FileType.CSV,
                    },
                    microscopy: {
                        wellIds: [8],
                    },
                },
                "/path/to/not-image.txt": {
                    file: {
                        fileType: FileType.TEXT,
                    },
                    microscopy: {
                        wellIds: [5],
                    },
                },
            };

            const payload = getUploadPayload(state);
            expect(payload).to.deep.equal(expected);
        });
    });
});
