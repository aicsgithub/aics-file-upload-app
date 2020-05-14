import { UploadMetadata, Uploads } from "@aics/aicsfiles/type-declarations/types";
import { expect } from "chai";
import { forEach, orderBy } from "lodash";
import { TemplateAnnotation } from "../../template/types";

import {
    getMockStateWithHistory,
    mockAnnotationTypes,
    mockAuditInfo,
    mockBooleanAnnotation,
    mockChannel,
    mockDateAnnotation,
    mockDateTimeAnnotation,
    mockDropdownAnnotation,
    mockFavoriteColorAnnotation,
    mockLookupAnnotation,
    mockMMSTemplate,
    mockNotesAnnotation,
    mockNumberAnnotation,
    mockSelection,
    mockState,
    mockTemplateStateBranch,
    mockTemplateStateBranchWithAppliedTemplate,
    mockTemplateWithManyValues,
    mockTextAnnotation,
    mockWellAnnotation,
    mockWorkflowAnnotation,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import { getUploadRowKey } from "../constants";

import {
    getCanGoForwardFromSelectStorageLocationPage,
    getFileToAnnotationHasValueMap,
    getFileToArchive,
    getFileToStoreOnIsilon,
    getUploadFileNames,
    getUploadFiles,
    getUploadKeyToAnnotationErrorMap,
    getUploadPayload,
    getUploadSummaryRows,
    getUploadValidationErrors,
    getUploadWithCalculatedData,
} from "../selectors";
import { FileType, MMSAnnotationValueRequest, UploadMetadata as UploadMetadataRow } from "../types";

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

describe("Upload selectors", () => {
    describe("getUploadWithCalculatedData", () => {
        it("adds wellLabels to the uploads", () => {
            const result = getUploadWithCalculatedData(nonEmptyStateForInitiatingUpload);
            expect(result[getUploadRowKey({ file: "/path/to/file1" })].wellLabels).to.deep.equal(["A1"]);
        });
    });

    describe("getUploadPayload", () => {
        it("Does not include annotations that are not on the template", () => {
            const file = "/path/to/image.tiff";
            const payload = getUploadPayload({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockState.template.present,
                    appliedTemplate: {
                        ...mockAuditInfo,
                        annotations: [mockFavoriteColorAnnotation],
                        name: "foo",
                        notes: [],
                        templateId: 1,
                        version: 1,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey({ file })]: {
                        barcode: "452",
                        favoriteColor: ["Blue"],
                        file,
                        notes: [],
                        plateId: 4,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        unexpectedAnnotation: ["Hello World"],
                        wellIds: [],
                    },
                }),
            });
            const unexpectedAnnotation = payload[file]?.customMetadata.annotations
                .find((a: {values: string[]}) => a.values.includes("Hello World"));
            expect(unexpectedAnnotation).to.be.undefined;
        });
        it("Interprets no values for a boolean annotation as false", () => {
            const state: State = {
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...nonEmptyStateForInitiatingUpload.template.present,
                    appliedTemplate: {
                        ...mockMMSTemplate,
                        annotations: [mockBooleanAnnotation],
                    },
                }),
                upload: getMockStateWithHistory({
                    "/path/to.dot/image.tiff": {
                        Qc: [],
                        barcode: "452",
                        file: "/path/to.dot/image.tiff",
                        notes: [],
                        plateId: 4,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [],
                    },
                }),
            };
            const expectedPayload = {
                "/path/to.dot/image.tiff": {
                    customMetadata: {
                        annotations: [
                            {
                                annotationId: mockBooleanAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["false"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to.dot/image.tiff",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                    },
                    microscopy: {},
                },
            };
            const actual = getUploadPayload(state);
            expect(actual).to.deep.equal(expectedPayload);
        });
        it("Converts upload state branch into correct payload for aicsfiles-js", () => {
            const state: State = {
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    "/path/to.dot/image.tiff": {
                        barcode: "452",
                        file: "/path/to.dot/image.tiff",
                        ["Favorite Color"]: ["blue"],
                        notes: [],
                        plateId: 4,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [],
                    },
                    "/path/to.dot/image.tiffscene:1channel:1": {
                        barcode: "452",
                        channel: mockChannel,
                        ["Favorite Color"]: "yellow",
                        file: "/path/to.dot/image.tiff",
                        notes: ["Seeing some interesting things here!"],
                        plateId: 4,
                        positionIndex: 1,
                        wellIds: [6],
                    },
                    "/path/to/image.czi": {
                        barcode: "567",
                        ["Favorite Color"]: ["red"],
                        file: "/path/to/image.czi",
                        notes: [],
                        plateId: 4,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [1],
                    },
                    "/path/to/image.ome.tiff": {
                        barcode: "123",
                        ["Favorite Color"]: ["green"],
                        file: "/path/to/image.ome.tiff",
                        notes: [],
                        plateId: 2,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [2],
                    },
                    "/path/to/image.png": {
                        barcode: "345",
                        ["Favorite Color"]: ["purple"],
                        file: "/path/to/image.png",
                        notes: [],
                        plateId: 5,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [3],
                    },
                    "/path/to/image.tiff": {
                        barcode: "234",
                        ["Favorite Color"]: ["orange"],
                        file: "/path/to/image.tiff",
                        notes: [],
                        plateId: 3,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [4],
                    },
                    "/path/to/multi-well.txt": {
                        barcode: "456",
                        ["Favorite Color"]: ["pink"],
                        file: "/path/to/multi-well.txt",
                        notes: [],
                        plateId: 7,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [5, 6, 7],
                    },
                    "/path/to/no-extension": {
                        barcode: "888",
                        ["Favorite Color"]: ["gold"],
                        file: "/path/to/no-extension",
                        notes: [],
                        plateId: 7,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [7],
                    },
                    "/path/to/not-image.csv": {
                        barcode: "578",
                        ["Favorite Color"]: ["grey"],
                        file: "/path/to/not-image.csv",
                        notes: [],
                        plateId: 7,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [8],
                    },
                    "/path/to/not-image.txt": {
                        barcode: "456",
                        ["Favorite Color"]: ["black"],
                        file: "/path/to/not-image.txt",
                        notes: [],
                        plateId: 7,
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
                        wellIds: [5],
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["blue"],
                            },
                            {
                                annotationId: mockFavoriteColorAnnotation.annotationId,
                                channelId: mockChannel.channelId,
                                positionIndex: 1,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["yellow"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: mockChannel.channelId,
                                positionIndex: 1,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["6"],
                            },
                            {
                                annotationId: mockNotesAnnotation.annotationId,
                                channelId: mockChannel.channelId,
                                positionIndex: 1,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["Seeing some interesting things here!"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to.dot/image.tiff",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["red"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["1"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.czi",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["green"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["2"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.ome.tiff",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["purple"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["3"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.png",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["orange"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["4"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.IMAGE,
                        originalPath: "/path/to/image.tiff",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["pink"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["5", "6", "7"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.TEXT,
                        originalPath: "/path/to/multi-well.txt",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["gold"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["7"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.OTHER,
                        originalPath: "/path/to/no-extension",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["grey"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["8"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.CSV,
                        originalPath: "/path/to/not-image.csv",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["black"],
                            },
                            {
                                annotationId: mockWellAnnotation.annotationId,
                                channelId: undefined,
                                positionIndex: undefined,
                                scene: undefined,
                                subImageName: undefined,
                                timePointId: undefined,
                                values: ["5"],
                            },
                        ],
                        templateId: mockMMSTemplate.templateId,
                    },
                    file: {
                        fileType: FileType.TEXT,
                        originalPath: "/path/to/not-image.txt",
                        shouldBeInArchive: true,
                        shouldBeInLocal: false,
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

    describe("getUploadFileNames", () => {
        it("returns empty string if no current upload", () => {
            const jobName = getUploadFileNames({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: mockAnnotationTypes,
                    annotations: [mockWellAnnotation, mockWorkflowAnnotation, mockNotesAnnotation],
                },
                template: getMockStateWithHistory(mockTemplateStateBranchWithAppliedTemplate),
                upload: getMockStateWithHistory({}),
            });
            expect(jobName).to.equal("");
        });

        it("returns file name when singular file in upload", () => {
            const jobName = getUploadFileNames({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: mockAnnotationTypes,
                    annotations: [mockWellAnnotation, mockWorkflowAnnotation, mockNotesAnnotation],
                },
                template: getMockStateWithHistory(mockTemplateStateBranchWithAppliedTemplate),
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file3"})]:
                        mockState.upload.present[getUploadRowKey({file: "/path/to/file3"})],
                }),
            });
            expect(jobName).to.equal("file3");
        });

        it("returns file names in correct order", () => {
            const jobName = getUploadFileNames({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    annotationTypes: mockAnnotationTypes,
                    annotations: [mockWellAnnotation, mockWorkflowAnnotation, mockNotesAnnotation],
                },
                template: getMockStateWithHistory(mockTemplateStateBranchWithAppliedTemplate),
            });
            expect(jobName).to.equal("file1, file2, file3");
        });
    });

    describe("getUploadSummaryRows", () => {
        it("handles files without scenes or channels", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
            });
            expect(rows.length).to.equal(3); // no rows expanded yet so excluding the row with a positionIndex
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1"}),
                notes: undefined,
                numberSiblings: 3,
                positionIndexes: [],
                scenes: [],
                shouldBeInArchive: true,
                shouldBeInLocal: true,
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [1],
                wellLabels: ["A1"],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1235",
                channelIds: [],
                file: "/path/to/file2",
                group: false,
                key: getUploadRowKey({file: "/path/to/file2"}),
                notes: undefined,
                numberSiblings: 3,
                positionIndexes: [],
                scenes: [],
                shouldBeInArchive: false,
                shouldBeInLocal: true,
                siblingIndex: 1,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [2],
                wellLabels: ["A2"],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1236",
                channelIds: [],
                file: "/path/to/file3",
                group: true,
                key: getUploadRowKey({file: "/path/to/file3"}),
                notes: undefined,
                numberSiblings: 3,
                positionIndexes: [1],
                scenes: [],
                shouldBeInArchive: true,
                shouldBeInLocal: false,
                siblingIndex: 2,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [1, 2, 3],
                wellLabels: ["A1", "A2", "B1"],
                workflows: [],
            });
        });
        it("does not show scene row if file row not expanded", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file1"})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        notes: [],
                        wellIds: [],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: 1})]: {
                        barcode: "1235",
                        file: "/path/to/file1",
                        notes: [],
                        positionIndex: 1,
                        wellIds: [2],
                    },
                }),
            });
            expect(rows.length).to.equal(1);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey({file: "/path/to/file1"}),
                notes: undefined,
                numberSiblings: 1,
                positionIndexes: [1],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [],
                wellLabels: [],
                workflows: [],
            });
        });
        it("shows scene row if file row is expanded", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    expandedUploadJobRows: {
                        [getUploadRowKey({file: "/path/to/file1"})]: true,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file1"})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        notes: [],
                        wellIds: [],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: 1})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        notes: [],
                        positionIndex: 1,
                        wellIds: [2],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey({file: "/path/to/file1"}),
                notes: undefined,
                numberSiblings: 1,
                positionIndexes: [1],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [],
                wellLabels: [],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: 1}),
                notes: undefined,
                numberSiblings: 1,
                positionIndex: 1,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 1,
                wellIds: [2],
                wellLabels: ["A2"],
                workflows: [],
            });
        });
        it("shows scene and channel only rows if file row is not present", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: 1})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        key: getUploadRowKey({file: "/path/to/file1", positionIndex: 1}),
                        notes: [],
                        positionIndex: 1,
                        wellIds: [2],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1})]: {
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        key: getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1}),
                        notes: [],
                        positionIndex: undefined,
                        wellIds: [2],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows[0]).to.deep.equal({
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1}),
                notes: undefined,
                numberSiblings: 2,
                positionIndex: undefined,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [2],
                wellLabels: ["A2"],
                workflows: [],
            });
            expect(rows[1]).to.deep.equal({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: 1}),
                notes: undefined,
                numberSiblings: 2,
                positionIndex: 1,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 1,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [2],
                wellLabels: ["A2"],
                workflows: [],
            });
        });
        it("handles files with channels", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    expandedUploadJobRows: {
                        [getUploadRowKey({file: "/path/to/file1"})]: true,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file1"})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        notes: undefined,
                        wellIds: [1],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1})]: {
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        notes: undefined,
                        positionIndex: undefined,
                        wellIds: [],
                    },
                }),
            });
            expect(rows.length).to.equal(2);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [1],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey({file: "/path/to/file1"}),
                notes: undefined,
                numberSiblings: 1,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [1],
                wellLabels: ["A1"],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1}),
                notes: undefined,
                numberSiblings: 1,
                positionIndex: undefined,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 1,
                wellIds: [],
                wellLabels: [],
                workflows: [],
            });
        });
        it("handles files with scenes and channels", () => {
            const rows = getUploadSummaryRows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    expandedUploadJobRows: {
                        [getUploadRowKey({file: "/path/to/file1"})]: true,
                        [getUploadRowKey({file: "/path/to/file1", positionIndex: 1})]: true,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file1"})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        notes: [],
                        wellIds: [],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: 1})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        notes: [],
                        positionIndex: 1,
                        wellIds: [],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: 1, channelId: 1})]: {
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        notes: [],
                        positionIndex: 1,
                        wellIds: [1],
                    },
                    [getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1})]: {
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        notes: [],
                        wellIds: [],
                    },
                }),
            });
            expect(rows.length).to.equal(4);
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [1],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey({file: "/path/to/file1"}),
                notes: undefined,
                numberSiblings: 1,
                positionIndexes: [1],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 0,
                wellIds: [],
                wellLabels: [],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channelIds: [],
                file: "/path/to/file1",
                group: true,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: 1}),
                notes: undefined,
                numberSiblings: 2,
                positionIndex: 1,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 1,
                subImageNames: [],
                treeDepth: 1,
                wellIds: [],
                wellLabels: [],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: 1, channelId: 1}),
                notes: undefined,
                numberSiblings: 1,
                positionIndex: 1,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 2,
                wellIds: [1],
                wellLabels: ["A1"],
                workflows: [],
            });
            expect(rows).to.deep.include({
                barcode: "1234",
                channel: mockChannel,
                channelIds: [],
                file: "/path/to/file1",
                group: false,
                key: getUploadRowKey({file: "/path/to/file1", positionIndex: undefined, channelId: 1}),
                notes: undefined,
                numberSiblings: 2,
                positionIndexes: [],
                scenes: [],
                siblingIndex: 0,
                subImageNames: [],
                treeDepth: 1,
                wellIds: [],
                wellLabels: [],
                workflows: [],
            });
        });
        it("does not throw error for annotations that don't exist on the template", () => {
            const file = "/path/to/file1";
            const getRows = () => getUploadSummaryRows({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockState.template.present,
                    appliedTemplate: {
                        ...mockAuditInfo,
                        annotations: [mockFavoriteColorAnnotation],
                        name: "foo",
                        notes: [],
                        templateId: 1,
                        version: 1,
                    },
                }),
                upload: getMockStateWithHistory({
                    [getUploadRowKey({ file })]: {
                        barcode: "1234",
                        favoriteColor: "Red",
                        file,
                        notes: [],
                        somethingUnexpected: "Hello World",
                        wellIds: [],
                    },
                }),
            });
            expect(getRows).to.not.throw();
        });
    });

    describe("getFileToAnnotationHasValueMap", () => {
        const file = "/path/to/file1";
        it("sets annotations with empty arrays or nil values as false", () => {
            const result = getFileToAnnotationHasValueMap({
                ...mockState,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file})]: {
                        age: undefined,
                        barcode: "abcd",
                        file,
                        notes: [],
                        shouldBeInArchive: true,
                        shouldBeInLocal: true,
                        wellIds: [],
                    },
                }),
            });
            expect(result[file]).to.deep.equal({
                age: false,
                barcode: true,
                file: true,
                notes: false,
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
                    [getUploadRowKey({file})]: {
                        age: undefined,
                        barcode: "abcd",
                        file,
                        notes: [],
                        wellIds: [],
                    },
                    [getUploadRowKey({file, positionIndex: 1})]: {
                        age: undefined,
                        barcode: "abcd",
                        file,
                        notes: [],
                        wellIds: [1],
                    },
                    [getUploadRowKey({file, positionIndex: 1, channelId: 1})]: {
                        age: 19,
                        barcode: "abcd",
                        file,
                        notes: [],
                        wellIds: [],
                    },
                }),
            });
            expect(result[file]).to.deep.equal({
                age: true,
                barcode: true,
                file: true,
                notes: false,
                wellIds: true,
                wellLabels: true,
            });
        });
    });

    describe("getUploadKeyToAnnotationErrorMap", () => {
        const uploadRowKey = getUploadRowKey({file: "/path/to/file1"});
        let goodUploadRow: UploadMetadataRow;
        const getValidations = (annotationToTest: TemplateAnnotation, value: any) => {
            return getUploadKeyToAnnotationErrorMap({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: mockTemplateWithManyValues,
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        ...goodUploadRow,
                        [annotationToTest.name]: value,
                    },
                }),
            });
        };

        beforeEach(() => {
            goodUploadRow = {
                "Another Garbage Text Annotation": ["valid", "valid"],
                "Birth Date": [new Date()],
                "Cas9": ["spCas9"],
                "Clone Number Garbage": [1, 2, 3],
                "Dropdown": [],
                "Qc": [false],
                "barcode": "",
                "file": "/path/to/file3",
                "notes": [],
                "wellIds": [],
                "workflows": [
                    "R&DExp",
                    "Pipeline 4.1",
                ],
            };
        });
        it("returns empty object if no validation errors", () => {
            const result = getUploadKeyToAnnotationErrorMap({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: mockTemplateWithManyValues,
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: goodUploadRow,
                }),
            });
            expect(result).to.deep.equal({});
        });
        it("sets error if an annotation value is not an array", () => {
            const result = getValidations(mockTextAnnotation, "BAD, BAD, BAD");
            expect(result).to.deep.equal({
                [uploadRowKey]: {
                    [mockTextAnnotation.name]: "Invalid format, expected list",
                },
            });
        });
        it("sets error if an annotation value ends with comma", () => {
            const result = getValidations(mockTextAnnotation, "BAD,");
            expect(result).to.deep.equal({
                [uploadRowKey]: {
                    [mockTextAnnotation.name]: "Invalid format: value ends with comma",
                },
            });
        });
        it("sets error if a lookup annotation contains a value that is not an annotation option",
            () => {
            const result = getValidations(mockLookupAnnotation, ["BAD"]);
            expect(result).to.deep.equal({
                [uploadRowKey]: {
                    [mockLookupAnnotation.name]: "BAD did not match any of the expected values: spCas9, Not Recorded",
                },
            });
        });
        it("sets error if a dropdown annotation contains a value that is not a dropdown option",
            () => {
            const result = getValidations(mockDropdownAnnotation, ["BAD"]);
            expect(result).to.deep.equal({
                [uploadRowKey]: {
                    [mockDropdownAnnotation.name]: "BAD did not match any of the expected values: A, B, C, D",
                },
            });
        });
        it("sets error if a boolean annotation contains a value that is not a boolean", () => {
            const result = getValidations(mockBooleanAnnotation, ["BAD"]);
            expect(result).to.deep.equal({
                [uploadRowKey]: {
                    [mockBooleanAnnotation.name]: "BAD did not match expected type: YesNo",
                },
            });
        });
        it("sets error if a text annotation contains a value that is not text",
            () => {
                const result = getValidations(mockTextAnnotation, [1]);
                expect(result).to.deep.equal({
                    [uploadRowKey]: {
                        [mockTextAnnotation.name]: "1 did not match expected type: Text",
                    },
                });
            });
        it("sets error if a number annotation contains a value that is not number",
            () => {
                const result = getValidations(mockNumberAnnotation, ["BAD"]);
                expect(result).to.deep.equal({
                    [uploadRowKey]: {
                        [mockNumberAnnotation.name]: "BAD did not match expected type: Number",
                    },
                });
            });
        it("sets error if a date annotation contains a value that is not date",
            () => {
                const result = getValidations(mockDateAnnotation, ["1-20"]);
                expect(result).to.deep.equal({
                    [uploadRowKey]: {
                        [mockDateAnnotation.name]: "1-20 did not match expected type: Date or DateTime",
                    },
                });
            });
        it("sets error if a datetime annotation contains a value that is not datetime",
            () => {
                const result = getValidations(mockDateTimeAnnotation, ["BAD"]);
                expect(result).to.deep.equal({
                    [uploadRowKey]: {
                        [mockDateTimeAnnotation.name]: "BAD did not match expected type: Date or DateTime",
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
        it("returns a map of files to booleans representing whether to store the file locally", () => {
            const result = getFileToStoreOnIsilon({
                ...nonEmptyStateForInitiatingUpload,
            });
            expect(result).to.deep.equal({
                "/path/to/file1": true,
                "/path/to/file2": true,
                "/path/to/file3": false,
            });
        });
    });

    describe("getCanGoForwardFromSelectStorageLocationPage", () => {
        it("returns true if all files have a place to go", () => {
            const result = getCanGoForwardFromSelectStorageLocationPage({
                ...nonEmptyStateForInitiatingUpload,
            });
            expect(result).to.be.true;
        });
        it("returns false if a file does not have a place to go", () => {
            const result = getCanGoForwardFromSelectStorageLocationPage({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "/path/to/file1"})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        key: getUploadRowKey({file: "/path/to/file"}),
                        notes: [],
                        shouldBeInArchive: false,
                        shouldBeInLocal: false,
                        wellIds: [1],
                    },
                }),
            });
            expect(result).to.be.false;
        });
    });

    describe("getUploadValidationErrors", () => {
        it("adds error if template not applied", () => {
            const errors = getUploadValidationErrors(mockState);
            expect(errors.includes("A template must be selected to submit an upload")).to.be.true;
        });
        it("adds error if no files to upload", () => {
            const errors = getUploadValidationErrors({...mockState, upload: getMockStateWithHistory({})});
            expect(errors.includes("No files to upload")).to.be.true;
        });
        it("adds error if a row does not have a well or workflow annotation", () => {
            const errors = getUploadValidationErrors({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "foo"})]: {
                        barcode: "abc",
                        file: "foo",
                        key: getUploadRowKey({file: "foo"}),
                        notes: [],
                        wellIds: [],
                    },
                }),
            });
            expect(errors.includes("foo must have either a well or workflow association")).to.be.true;
        });
        it("adds error if row is missing an annotation value that is required", () => {
            const errors = getUploadValidationErrors({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file: "foo"})]: {
                        "Favorite Color": undefined,
                        "barcode": "abc",
                        "file": "foo",
                        "key": getUploadRowKey({file: "foo"}),
                        "notes": [],
                        "wellIds": [],
                    },
                }),
            });
            expect(errors.includes("\"foo\" is missing the following required annotations: Favorite Color")).to.be.true;
        });
        it("adds error if an annotation value is not formatted correctly", () => {
            const file = "foo";
            const key = getUploadRowKey({file});
            const errors = getUploadValidationErrors({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [key]: {
                        "Favorite Color": "red",
                        "barcode": "1234",
                        file,
                        key,
                        "notes": [],
                        "wellIds": [1],
                    },
                }),
            });
            expect(errors.includes("Unexpected format for annotation type. Hover red x icons for more information."))
                .to.be.true;
        });
    });
});
