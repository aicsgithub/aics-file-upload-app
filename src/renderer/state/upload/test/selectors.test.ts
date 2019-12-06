import { UploadMetadata, Uploads } from "@aics/aicsfiles/type-declarations/types";
import { expect } from "chai";
import { forEach, keys, orderBy } from "lodash";

import {
    getMockStateWithHistory,
    mockChannel,
    mockFavoriteColorAnnotation,
    mockMMSTemplate,
    mockNotesAnnotation,
    mockSelection,
    mockState,
    mockTemplateStateBranch,
    mockTemplateWithManyValues,
    mockWellAnnotation,
    nonEmptyJobStateBranch,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import { getUploadRowKey } from "../constants";

import {
    getFileToAnnotationHasValueMap,
    getFileToArchive,
    getUploadFiles,
    getUploadJobName,
    getUploadPayload,
    getUploadSummaryRows,
    getValidationErrorsMap,
} from "../selectors";
import { FileType, MMSAnnotationValueRequest } from "../types";

const orderAnnotationValueRequests = (annotations: MMSAnnotationValueRequest[]) => {
    return orderBy(annotations, ["annotationId", "positionId", "channelId", "timePointId"]);
};

// utility function to allow us to deeply compare expected and actual output without worrying about order
const standardizeUploads = (uploads: Uploads): Uploads => {
    const result: Uploads = {};
    forEach(uploads, (upload: UploadMetadata, file: string) => {
        result[file] = {
            ...upload,
            customMetadata: {
                ...upload.customMetadata,
                annotations: orderAnnotationValueRequests(upload.customMetadata.annotations),
            },
        };
    });
    return result;
};

const DEFAULT_UPLOAD = {
    notes: undefined,
    shouldBeInArchive: true,
    shouldBeInLocal: true,
};

describe("Upload selectors", () => {
    describe("getUploadPayload", () => {
        it("Converts upload state branch into correct payload for aicsfiles-js", () => {
            const state: State = {
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    "/path/to.dot/image.tiff": {
                        ...DEFAULT_UPLOAD,
                        barcode: "452",
                        file: "/path/to.dot/image.tiff",
                        ["Favorite Color"]: "blue",
                        plateId: 4,
                        wellIds: [],
                        wellLabels: [],
                    },
                    "/path/to.dot/image.tiffscene:1channel:1": {
                        ...DEFAULT_UPLOAD,
                        barcode: "452",
                        channel: mockChannel,
                        ["Favorite Color"]: "yellow",
                        file: "/path/to.dot/image.tiff",
                        notes: "Seeing some interesting things here!",
                        plateId: 4,
                        positionIndex: 1,
                        wellIds: [6],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.czi": {
                        ...DEFAULT_UPLOAD,
                        barcode: "567",
                        ["Favorite Color"]: "red",
                        file: "/path/to/image.czi",
                        plateId: 4,
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.ome.tiff": {
                        ...DEFAULT_UPLOAD,
                        barcode: "123",
                        ["Favorite Color"]: "green",
                        file: "/path/to/image.ome.tiff",
                        plateId: 2,
                        wellIds: [2],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.png": {
                        ...DEFAULT_UPLOAD,
                        barcode: "345",
                        ["Favorite Color"]: "purple",
                        file: "/path/to/image.png",
                        plateId: 5,
                        wellIds: [3],
                        wellLabels: ["A1"],
                    },
                    "/path/to/image.tiff": {
                        ...DEFAULT_UPLOAD,
                        barcode: "234",
                        ["Favorite Color"]: "orange",
                        file: "/path/to/image.tiff",
                        plateId: 3,
                        wellIds: [4],
                        wellLabels: ["A1"],
                    },
                    "/path/to/multi-well.txt": {
                        ...DEFAULT_UPLOAD,
                        barcode: "456",
                        ["Favorite Color"]: "pink",
                        file: "/path/to/multi-well.txt",
                        plateId: 7,
                        wellIds: [5, 6, 7],
                        wellLabels: ["A1", "A2", "A3"],
                    },
                    "/path/to/no-extension": {
                        ...DEFAULT_UPLOAD,
                        barcode: "888",
                        ["Favorite Color"]: "gold",
                        file: "/path/to/no-extension",
                        plateId: 7,
                        wellIds: [7],
                        wellLabels: ["A1"],
                    },
                    "/path/to/not-image.csv": {
                        ...DEFAULT_UPLOAD,
                        barcode: "578",
                        ["Favorite Color"]: "grey",
                        file: "/path/to/not-image.csv",
                        plateId: 7,
                        wellIds: [8],
                        wellLabels: ["A1"],
                    },
                    "/path/to/not-image.txt": {
                        ...DEFAULT_UPLOAD,
                        barcode: "456",
                        ["Favorite Color"]: "black",
                        file: "/path/to/not-image.txt",
                        plateId: 7,
                        wellIds: [5],
                        wellLabels: ["A1"],
                    },
                }),
            };
            const expected = {
                "/path/to.dot/image.tiff": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["blue"],
                            },
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: mockChannel.channelId,
                                positionIndex: 1,
                                timePointId: undefined,
                                values: ["yellow"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: mockChannel.channelId,
                                positionIndex: 1,
                                timePointId: undefined,
                                values: ["6"],
                            },
                            {
                                annotationId: mockNotesAnnotation.annotationId,
                                channelId: mockChannel.channelId,
                                positionIndex: 1,
                                timePointId: undefined,
                                values: ["Seeing some interesting things here!"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to.dot/image.tiff",
                    },
                    microscopy: {
                        wellIds: [6],
                    },
                },
                "/path/to/image.czi": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["red"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["1"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.czi",
                    },
                    microscopy: {
                        wellIds: [1],
                    },
                },
                "/path/to/image.ome.tiff": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["green"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["2"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.ome.tiff",
                    },
                    microscopy: {
                        wellIds: [2],
                    },
                },
                "/path/to/image.png": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["purple"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["3"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.png",
                    },
                    microscopy: {
                        wellIds: [3],
                    },
                },
                "/path/to/image.tiff": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["orange"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["4"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.tiff",
                    },
                    microscopy: {
                        wellIds: [4],
                    },
                },
                "/path/to/multi-well.txt": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["pink"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["5", "6", "7"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.TEXT,
                        originalPath: "/path/to/multi-well.txt",
                    },
                    microscopy: {
                        wellIds: [5, 6, 7],
                    },
                },
                "/path/to/no-extension": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["gold"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["7"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.OTHER,
                        originalPath: "/path/to/no-extension",
                    },
                    microscopy: {
                        wellIds: [7],
                    },
                },
                "/path/to/not-image.csv": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["grey"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["8"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.CSV,
                        originalPath: "/path/to/not-image.csv",
                    },
                    microscopy: {
                        wellIds: [8],
                    },
                },
                "/path/to/not-image.txt": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["black"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                timePointId: undefined,
                                values: ["5"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.TEXT,
                        originalPath: "/path/to/not-image.txt",
                    },
                    microscopy: {
                        wellIds: [5],
                    },
                },
            };

            const payload: Uploads = getUploadPayload(state);
            expect(standardizeUploads(payload)).to.deep.equal(standardizeUploads(expected));
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
                shouldBeInArchive: true,
                shouldBeInLocal: true,
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
                shouldBeInArchive: false,
                shouldBeInLocal: true,
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
                shouldBeInArchive: true,
                shouldBeInLocal: false,
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
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey("/path/to/file1", 1)]: {
                        ...DEFAULT_UPLOAD,
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
                ...DEFAULT_UPLOAD,
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
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey("/path/to/file1", 1)]: {
                        ...DEFAULT_UPLOAD,
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
                ...DEFAULT_UPLOAD,
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
                ...DEFAULT_UPLOAD,
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
        it("shows scene and channel only rows if file row is not present", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey("/path/to/file1", 1)]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        file: "/path/to/file1",
                        key: getUploadRowKey("/path/to/file1", 1),
                        positionIndex: 1,
                        wellIds: [2],
                        wellLabels: ["A2"],
                    },
                    [getUploadRowKey("/path/to/file1", undefined, 1)]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        key: getUploadRowKey("/path/to/file1", undefined, 1),
                        positionIndex: undefined,
                        wellIds: [2],
                        wellLabels: ["A2"],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows[0]).to.deep.equal({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", undefined, 1),
                numberSiblings: 2,
                positionIndex: undefined,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 0,
                wellIds: [2],
                wellLabels: "A2",
                workflows: "",
            });
            expect(rows[1]).to.deep.equal({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", 1),
                numberSiblings: 2,
                positionIndex: 1,
                positionIndexes: [],
                siblingIndex: 1,
                treeDepth: 0,
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
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    [getUploadRowKey("/path/to/file1", undefined, 1)]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        positionIndex: undefined,
                        wellIds: [],
                        wellLabels: [],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows).to.deep.include({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channelIds: [1],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey("/path/to/file1"),
                numberSiblings: 1,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 0,
                wellIds: [1],
                wellLabels: "A1",
                workflows: "",
            });
            expect(rows).to.deep.include({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", undefined, 1),
                numberSiblings: 1,
                positionIndex: undefined,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 1,
                wellIds: [],
                wellLabels: "",
                workflows: "",
            });
        });
        it("handles files with scenes and channels", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    expandedUploadJobRows: {
                        [getUploadRowKey("/path/to/file1")]: true,
                        [getUploadRowKey("/path/to/file1", 1)]: true,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey("/path/to/file1")]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey("/path/to/file1", 1)]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey("/path/to/file1", 1, 1)]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    [getUploadRowKey("/path/to/file1", undefined, 1)]: {
                        ...DEFAULT_UPLOAD,
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                }),
            });
            expect(rows.length).to.equal(4);
            expect(rows).to.deep.include({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channelIds: [1],
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
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey("/path/to/file1", 1),
                numberSiblings: 2,
                positionIndex: 1,
                positionIndexes: [],
                siblingIndex: 1,
                treeDepth: 1,
                wellIds: [],
                wellLabels: "",
                workflows: "",
            });
            expect(rows).to.deep.include({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", 1, 1),
                numberSiblings: 1,
                positionIndex: 1,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 2,
                wellIds: [1],
                wellLabels: "A1",
                workflows: "",
            });
            expect(rows).to.deep.include({
                ...DEFAULT_UPLOAD,
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey("/path/to/file1", undefined, 1),
                numberSiblings: 2,
                positionIndexes: [],
                siblingIndex: 0,
                treeDepth: 1,
                wellIds: [],
                wellLabels: "",
                workflows: "",
            });
        });
    });

    describe("getFileToAnnotationHasValueMap", () => {
        const file = "/path/to/file1";
        it("sets annotations with empty arrays or nil values as false", () => {
            const result = getFileToAnnotationHasValueMap({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey(file)]: {
                        age: undefined,
                        barcode: "abcd",
                        file,
                        shouldBeInArchive: true,
                        shouldBeInLocal: true,
                        wellIds: [],
                        wellLabels: [],
                    },
                }),
            });
            expect(result[file]).to.deep.equal({
                age: false,
                barcode: true,
                file: true,
                shouldBeInArchive: true,
                shouldBeInLocal: true,
                wellIds: false,
                wellLabels: false,
            });
        });

        it("sets annotation to true if one of the dimensions has that annotation set for a file", () => {
            const result = getFileToAnnotationHasValueMap({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey(file)]: {
                        ...DEFAULT_UPLOAD,
                        age: undefined,
                        barcode: "abcd",
                        file,
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey(file, 1)]: {
                        ...DEFAULT_UPLOAD,
                        age: undefined,
                        barcode: "abcd",
                        file,
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                    [getUploadRowKey(file, 1, 1)]: {
                        ...DEFAULT_UPLOAD,
                        age: 19,
                        barcode: "abcd",
                        file,
                        wellIds: [],
                        wellLabels: [],
                    },
                }),
            });
            expect(result[file]).to.deep.equal({
                ...DEFAULT_UPLOAD,
                age: true,
                barcode: true,
                file: true,
                notes: false,
                wellIds: true,
                wellLabels: true,
            });
        });
    });

    describe("getValidationErrorsMap", () => {
        it("returns empty object if no validation errors", () => {
            const uploadRowKey = getUploadRowKey("/path/to/file1");
            const result = getValidationErrorsMap({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: mockTemplateWithManyValues,
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        ...DEFAULT_UPLOAD,
                        "Another Garbage Text Annotation": ["valid", "valid"],
                        "Birth Date": [new Date()],
                        "Cas9": [],
                        "Clone Number Garbage": [1, 2, 3],
                        "Dropdown": undefined,
                        "Qc": [false],
                        "barcode": "",
                        "file": "/path/to/file3",
                        "notes": undefined,
                        "templateId": 8,
                        "wellIds": [],
                        "wellLabels": [],
                        "workflows": [
                            "R&DExp",
                            "Pipeline 4.1",
                        ],
                    },
                }),
            });
            expect(result).to.deep.equal({});
        });
        it("sets error if a multi-value annotation is not an array", () => {
            const uploadRowKey = getUploadRowKey("/path/to/file1");
            const result = getValidationErrorsMap({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: mockTemplateWithManyValues,
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        ...DEFAULT_UPLOAD,
                        "Another Garbage Text Annotation": "should, not, be, a, string",
                        "Birth Date": [new Date()],
                        "Cas9": [],
                        "Clone Number Garbage": "1, 2, 3,",
                        "Dropdown": undefined,
                        "Qc": [false],
                        "barcode": "",
                        "file": "/path/to/file3",
                        "notes": undefined,
                        "templateId": 8,
                        "wellIds": [],
                        "wellLabels": [],
                        "workflows": [
                            "R&DExp",
                            "Pipeline 4.1",
                        ],
                    },
                }),
            });
            const error = "Invalid format";
            expect(result).to.deep.equal({
                [uploadRowKey]: {
                    "Another Garbage Text Annotation": error,
                    "Clone Number Garbage": error,
                },
            });
        });
    });

    describe("getUploadFiles", () => {
        it("returns a unique set of files to be uploaded", () => {
            const result = getUploadFiles({
                ...nonEmptyStateForInitiatingUpload,
            });
            expect(result.sort()).to.deep.equal(["/path/to/file1", "/path/to/file2", "/path/to/file3"]);
        });
    });

    describe("getFileToArchive", () => {
        it("returns a map of files to booleans representing whether to archive the file", () => {
            const result = getFileToArchive({
                ...nonEmptyStateForInitiatingUpload,
            });
            expect(result).to.deep.equal({
                "/path/to/file1": true,
                "/path/to/file2": false,
                "/path/to/file3": true,
            });
        });
    });

    describe("getFileToStoreOnIsilon", () => {
        it("returns a map of files to booleans representing whether to archive the file", () => {
            const result = getFileToArchive({
                ...nonEmptyStateForInitiatingUpload,
            });
            expect(result).to.deep.equal({
                "/path/to/file1": true,
                "/path/to/file2": false,
                "/path/to/file3": true,
            });
        });
    });
});
