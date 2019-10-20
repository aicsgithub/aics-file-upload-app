import { expect } from "chai";

import { getMockStateWithHistory, mockSelection, mockState, nonEmptyJobStateBranch } from "../../test/mocks";
import { State } from "../../types";

import { getUploadJobName, getUploadPayload } from "../selectors";
import { FileType } from "../types";

describe("Upload selectors", () => {
    describe("getUploadPayload", () => {
        it("Adds correct file type and moves wellId to microscopy section", () => {
            const state: State = {
                ...mockState,
                upload: getMockStateWithHistory({
                    "/path/to.dot/image.tiff": {
                        barcode: "452",
                        file: "/path/to.dot/image.tiff",
                        notes: undefined,
                        plateId: 4,
                        wellIds: [6],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.czi": {
                        barcode: "567",
                        file: "/path/to/image.czi",
                        notes: undefined,
                        plateId: 4,
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.ome.tiff": {
                        barcode: "123",
                        file: "/path/to/image.ome.tiff",
                        notes: undefined,
                        plateId: 2,
                        wellIds: [2],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.png": {
                        barcode: "345",
                        file: "/path/to/image.png",
                        notes: undefined,
                        plateId: 5,
                        wellIds: [3],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.tiff": {
                        barcode: "234",
                        file: "/path/to/image.tiff",
                        notes: undefined,
                        plateId: 3,
                        wellIds: [4],
                        wellLabels: ["A1"],
                    },
                    "/path/to/multi-well.txt": {
                        barcode: "456",
                        file: "/path/to/multi-well.txt",
                        notes: undefined,
                        plateId: 7,
                        wellIds: [5, 6, 7],
                        wellLabels: ["A1", "A2", "A3"],
                    },
                    "/path/to/no-extension": {
                        barcode: "888",
                        file: "/path/to/no-extension",
                        notes: undefined,
                        plateId: 7,
                        wellIds: [7],
                        wellLabels: ["A1"],
                    },
                    "/path/to/not-image.csv": {
                        barcode: "578",
                        file: "/path/to/not-image.csv",
                        notes: undefined,
                        plateId: 7,
                        wellIds: [8],
                        wellLabels: ["A1"],
                    },
                    "/path/to/not-image.txt": {
                        barcode: "456",
                        file: "/path/to/not-image.txt",
                        notes: undefined,
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
                        originalPath: "/path/to.dot/image.tiff",
                    },
                    microscopy: {
                        wellIds: [6],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/image.czi": {
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.czi",
                    },
                    microscopy: {
                        wellIds: [1],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/image.ome.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.ome.tiff",
                    },
                    microscopy: {
                        wellIds: [2],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/image.png": {
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.png",
                    },
                    microscopy: {
                        wellIds: [3],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/image.tiff": {
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.tiff",
                    },
                    microscopy: {
                        wellIds: [4],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/multi-well.txt": {
                    file: {
                        fileType: FileType.TEXT,
                        originalPath: "/path/to/multi-well.txt",
                    },
                    microscopy: {
                        wellIds: [5, 6, 7],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/no-extension": {
                    file: {
                        fileType: FileType.OTHER,
                        originalPath: "/path/to/no-extension",
                    },
                    microscopy: {
                        wellIds: [7],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/not-image.csv": {
                    file: {
                        fileType: FileType.CSV,
                        originalPath: "/path/to/not-image.csv",
                    },
                    microscopy: {
                        wellIds: [8],
                    },
                    userData: {
                        notes: undefined,
                    },
                },
                "/path/to/not-image.txt": {
                    file: {
                        fileType: FileType.TEXT,
                        originalPath: "/path/to/not-image.txt",
                    },
                    microscopy: {
                        wellIds: [5],
                    },
                    userData: {
                        notes: undefined,
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
