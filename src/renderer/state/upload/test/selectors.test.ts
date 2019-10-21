import { expect } from "chai";
import { keys } from "lodash";

import {
    getMockStateWithHistory,
    mockSelection,
    mockState,
    nonEmptyJobStateBranch,
} from "../../test/mocks";
import { State } from "../../types";
import { getUploadRowKey } from "../constants";

import { getUploadJobName, getUploadPayload, getUploadSummaryRows } from "../selectors";
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

    describe("getUploadSummaryRows", () => {
        it("handles files without scenes or channels", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
            });
            expect(rows.length).to.equal(keys(mockState.upload.present).length);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1"),
                numberSiblings: 3,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 0,
                wellIds: [1],
                wellLabels: "A1",
                workflows: "",
            });
            expect(rows).to.deep.include({
                barcode: "1235",
                channelIds: [],
                file: "/path/to/file2",
                group: false,
                key: getUploadRowKey("/path/to/file2"),
                numberSiblings: 3,
                positionIndexes: [],
                siblingIndex: 1,
                treeDepth: 0,
                wellIds: [2],
                wellLabels: "A2",
                workflows: "",
            });
            expect(rows).to.deep.include({
                barcode: "1236",
                channelIds: [],
                file: "/path/to/file3",
                group: false,
                key: getUploadRowKey("/path/to/file3"),
                numberSiblings: 3,
                positionIndexes: [],
                siblingIndex: 2,
                treeDepth: 0,
                wellIds: [1, 2, 3],
                wellLabels: "A1, A2, B1",
                workflows: "",
            });
        });
        it("does not show scene row if file row not expanded", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey("/path/to/file1")]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey("/path/to/file1", 1)]: {
                        barcode: "1235",
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [2],
                        wellLabels: ["A2"],
                    },
                }),
            });
            expect(rows.length).to.equal(1);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey("/path/to/file1"),
                numberSiblings: 1,
                positionIndexes: [1],
                siblingIndex: 0,
                treeDepth: 0,
                wellIds: [],
                wellLabels: "",
                workflows: "",
            });
        });
        it("shows scene row if file row is expanded", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    expandedUploadJobRows: {
                        [getUploadRowKey("/path/to/file1")]: true,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey("/path/to/file1")]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey("/path/to/file1", 1)]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [2],
                        wellLabels: ["A2"],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey("/path/to/file1"),
                numberSiblings: 1,
                positionIndexes: [1],
                siblingIndex: 0,
                treeDepth: 0,
                wellIds: [],
                wellLabels: "",
                workflows: "",
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", 1),
                numberSiblings: 1,
                positionIndex: 1,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 1,
                wellIds: [2],
                wellLabels: "A2",
                workflows: "",
            });
        });
        it("handles files with channels", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    expandedUploadJobRows: {
                        [getUploadRowKey("/path/to/file1")]: true,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey("/path/to/file1")]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    [getUploadRowKey("/path/to/file1", undefined, 1)]: {
                        barcode: "1234",
                        channel: {channelId: 1, description: "", name: "name" },
                        file: "/path/to/file1",
                        positionIndex: undefined,
                        wellIds: [],
                        wellLabels: [],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [1],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey("/path/to/file1"),
                numberSiblings: 1,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 0,
                wellIds: [2],
                wellLabels: "A2",
                workflows: "",
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", undefined, 1),
                numberSiblings: 1,
                positionIndex: 1,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 1,
                wellIds: [],
                wellLabels: "",
                workflows: "",
            });
        });
        it("handles files with scenes and channels", () => {

        });
    });

    describe("getFileToAnnotationHasValueMap", () => {

    });
});
