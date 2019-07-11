import { expect } from "chai";
import { difference } from "lodash";

import { getMockStateWithHistory, mockSelection, mockState, nonEmptyJobStateBranch } from "../../test/mocks";
import { State } from "../../types";

import { getUploadJobName, getUploadPayload, getWellIdToFiles } from "../selectors";
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
                    "/path1": {barcode, wellId, wellLabel},
                    "/path2": {barcode, wellId, wellLabel},
                    "/path3": {barcode, wellId, wellLabel},
                    "/path4": {barcode, wellId: wellId2, wellLabel: wellLabel2},
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
                        wellId: 6,
                        wellLabel: "A1",
                    },
                    "/path/to/image.czi": {
                        barcode: "567",
                        plateId: 4,
                        wellId: 1,
                        wellLabel: "A1",
                    },
                    "/path/to/image.ome.tiff": {
                        barcode: "123",
                        plateId: 2,
                        wellId: 2,
                        wellLabel: "A1",
                    },
                    "/path/to/image.png": {
                        barcode: "345",
                        plateId: 5,
                        wellId: 3,
                        wellLabel: "A1",
                    },
                    "/path/to/image.tiff": {
                        barcode: "234",
                        plateId: 3,
                        wellId: 4,
                        wellLabel: "A1",
                    },
                    "/path/to/no-extension": {
                        barcode: "888",
                        plateId: 7,
                        wellId: 7,
                        wellLabel: "A1",
                    },
                    "/path/to/not-image.csv": {
                        barcode: "578",
                        plateId: 7,
                        wellId: 8,
                        wellLabel: "A1",
                    },
                    "/path/to/not-image.txt": {
                        barcode: "456",
                        plateId: 7,
                        wellId: 5,
                        wellLabel: "A1",
                    },
                }),
            };
            const expected = {
                "/path/to.dot/image.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellId: 6,
                    },
                },
                "/path/to/image.czi": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellId: 1,
                    },
                },
                "/path/to/image.ome.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellId: 2,
                    },
                },
                "/path/to/image.png": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellId: 3,
                    },
                },
                "/path/to/image.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                    },
                    microscopy: {
                        wellId: 4,
                    },
                },
                "/path/to/no-extension": {
                    file: {
                        fileType: FileType.OTHER,
                    },
                    microscopy: {
                        wellId: 7,
                    },
                },
                "/path/to/not-image.csv": {
                    file: {
                        fileType: FileType.CSV,
                    },
                    microscopy: {
                        wellId: 8,
                    },
                },
                "/path/to/not-image.txt": {
                    file: {
                        fileType: FileType.TEXT,
                    },
                    microscopy: {
                        wellId: 5,
                    },
                },
            };

            const payload = getUploadPayload(state);
            expect(payload).to.deep.equal(expected);
        });
    });

    describe("getUploadJobName", () => {
        it("returns empty string if no barcode selected", () => {
            const jobName = getUploadJobName(mockState);
            expect(jobName).to.equal("");
        });

        it("returns selected barcode if no other jobs with barcode found", () => {
            const barcode = "test1234";
            const jobName = getUploadJobName({
                ...mockState,
                job: nonEmptyJobStateBranch,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    barcode,
                }),
            });
            expect(jobName).to.equal(barcode);
        });

        it("returns selected barcode and count in parenthesis if multiple jobs with barcode found", () => {
            const barcode = "mockWorkingUploadJob";
            const jobName = getUploadJobName({
                ...mockState,
                job: nonEmptyJobStateBranch,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    barcode,
                }),
            });
            expect(jobName).to.equal(`${barcode} (1)`);
        });

        it("Sees jobNames 'mockWorkingUploadJob' and 'mockWorkingUploadJob2' as separate barcodes", () => {
            const barcode = "mockWorkingUploadJob";
            const jobName = getUploadJobName({
                ...mockState,
                job: nonEmptyJobStateBranch,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    barcode: `${barcode}2`,
                }),
            });
            expect(jobName).to.equal(`${barcode}2`);
        });
    });
});
