import {
  UploadMetadata,
  Uploads,
} from "@aics/aicsfiles/type-declarations/types";
import { expect } from "chai";
import { forEach, orderBy } from "lodash";

import {
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../../constants";
import { Page } from "../../route/types";
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
  getCanUndoUpload,
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
import {
  FileType,
  MMSAnnotationValueRequest,
  UploadMetadata as UploadMetadataRow,
} from "../types";

const orderAnnotationValueRequests = (
  annotations: MMSAnnotationValueRequest[]
) => {
  return orderBy(annotations, [
    "annotationId",
    "positionId",
    "channelId",
    "timePointId",
  ]);
};

// utility function to allow us to deeply compare expected and actual output without worrying about order
const standardizeUploads = (uploads: Uploads): Uploads => {
  const result: Uploads = {};
  forEach(uploads, (upload: UploadMetadata, file: string) => {
    result[file] = {
      ...upload,
      customMetadata: {
        ...upload.customMetadata,
        annotations: orderAnnotationValueRequests(
          upload.customMetadata.annotations
        ),
      },
    };
  });
  return result;
};

describe("Upload selectors", () => {
  describe("getCanUndoUpload", () => {
    it("should return false if the past is empty and not on AddCustomData page", () => {
      expect(getCanUndoUpload(mockState)).to.equal(false);
    });

    it("should return false if on AddCustomData page and previous action is from the previous page", () => {
      const state: State = {
        ...mockState,
        route: {
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
        metadata: {
          ...mockState.metadata,
          history: {
            selection: {},
            template: {},
            upload: {
              [Page.DragAndDrop]: 0,
              [Page.SelectUploadType]: 0,
              [Page.AssociateFiles]: 1,
              [Page.SelectStorageLocation]: 2,
            },
          },
        },
        upload: {
          ...mockState.upload,
          index: 3,
        },
      };

      expect(getCanUndoUpload(state)).to.equal(false);
    });

    it("should return true if on AddCustomData page and previous action is not from the previous page", () => {
      const state = {
        ...mockState,
        route: {
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
        metadata: {
          ...mockState.metadata,
          history: {
            selection: {},
            template: {},
            upload: {
              [Page.DragAndDrop]: 0,
              [Page.SelectUploadType]: 0,
              [Page.AssociateFiles]: 1,
              [Page.SelectStorageLocation]: 2,
            },
          },
        },
        upload: {
          ...mockState.upload,
          index: 4,
        },
      };

      expect(getCanUndoUpload(state)).to.equal(true);
    });
  });

  describe("getUploadWithCalculatedData", () => {
    it("adds wellLabels to the uploads", () => {
      const result = getUploadWithCalculatedData(
        nonEmptyStateForInitiatingUpload
      );
      expect(
        result[getUploadRowKey({ file: "/path/to/file1" })].wellLabels
      ).to.deep.equal(["A1"]);
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
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 1,
            version: 1,
          },
        }),
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file })]: {
            barcode: "452",
            favoriteColor: ["Blue"],
            file,
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 4,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            unexpectedAnnotation: ["Hello World"],
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      const unexpectedAnnotation = payload[
        file
      ]?.customMetadata.annotations.find((a: { values: string[] }) =>
        a.values.includes("Hello World")
      );
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
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 4,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [],
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
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 4,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [],
          },
          "/path/to.dot/image.tiffscene:1channel:1": {
            barcode: "452",
            channel: mockChannel,
            ["Favorite Color"]: "yellow",
            file: "/path/to.dot/image.tiff",
            [NOTES_ANNOTATION_NAME]: ["Seeing some interesting things here!"],
            plateId: 4,
            positionIndex: 1,
            [WELL_ANNOTATION_NAME]: [6],
          },
          "/path/to/image.czi": {
            barcode: "567",
            ["Favorite Color"]: ["red"],
            file: "/path/to/image.czi",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 4,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [1],
          },
          "/path/to/image.ome.tiff": {
            barcode: "123",
            ["Favorite Color"]: ["green"],
            file: "/path/to/image.ome.tiff",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 2,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [2],
          },
          "/path/to/image.png": {
            barcode: "345",
            ["Favorite Color"]: ["purple"],
            file: "/path/to/image.png",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 5,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [3],
          },
          "/path/to/image.tiff": {
            barcode: "234",
            ["Favorite Color"]: ["orange"],
            file: "/path/to/image.tiff",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 3,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [4],
          },
          "/path/to/multi-well.txt": {
            barcode: "456",
            ["Favorite Color"]: ["pink"],
            file: "/path/to/multi-well.txt",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 7,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [5, 6, 7],
          },
          "/path/to/no-extension": {
            barcode: "888",
            ["Favorite Color"]: ["gold"],
            file: "/path/to/no-extension",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 7,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [7],
          },
          "/path/to/not-image.csv": {
            barcode: "578",
            ["Favorite Color"]: ["grey"],
            file: "/path/to/not-image.csv",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 7,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [8],
          },
          "/path/to/not-image.txt": {
            barcode: "456",
            ["Favorite Color"]: ["black"],
            file: "/path/to/not-image.txt",
            [NOTES_ANNOTATION_NAME]: [],
            plateId: 7,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [5],
          },
        }),
      };
      const expected: Uploads = {
        "/path/to.dot/image.tiff": {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["blue"],
              },
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                channelId: mockChannel.name,
                positionIndex: 1,
                scene: undefined,
                subImageName: undefined,
                values: ["yellow"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: mockChannel.name,
                positionIndex: 1,
                scene: undefined,
                subImageName: undefined,
                values: ["6"],
              },
              {
                annotationId: mockNotesAnnotation.annotationId,
                channelId: mockChannel.name,
                positionIndex: 1,
                scene: undefined,
                subImageName: undefined,
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
                values: ["red"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["green"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["purple"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["orange"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["pink"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["gold"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["grey"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                values: ["black"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
      expect(standardizeUploads(payload)).to.deep.equal(
        standardizeUploads(expected)
      );
    });
  });

  describe("getUploadFileNames", () => {
    it("returns empty string if no current upload", () => {
      const jobName = getUploadFileNames({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: mockAnnotationTypes,
          annotations: [
            mockWellAnnotation,
            mockWorkflowAnnotation,
            mockNotesAnnotation,
          ],
        },
        template: getMockStateWithHistory(
          mockTemplateStateBranchWithAppliedTemplate
        ),
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
          annotations: [
            mockWellAnnotation,
            mockWorkflowAnnotation,
            mockNotesAnnotation,
          ],
        },
        template: getMockStateWithHistory(
          mockTemplateStateBranchWithAppliedTemplate
        ),
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file3" })]: mockState.upload
            .present[getUploadRowKey({ file: "/path/to/file3" })],
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
          annotations: [
            mockWellAnnotation,
            mockWorkflowAnnotation,
            mockNotesAnnotation,
          ],
        },
        template: getMockStateWithHistory(
          mockTemplateStateBranchWithAppliedTemplate
        ),
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
        key: getUploadRowKey({ file: "/path/to/file1" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 3,
        positionIndexes: [],
        scenes: [],
        shouldBeInArchive: true,
        shouldBeInLocal: true,
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [1],
        wellLabels: ["A1"],
        [WORKFLOW_ANNOTATION_NAME]: ["name1"],
      });
      expect(rows).to.deep.include({
        barcode: "1235",
        channelIds: [],
        file: "/path/to/file2",
        group: false,
        key: getUploadRowKey({ file: "/path/to/file2" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 3,
        positionIndexes: [],
        scenes: [],
        shouldBeInArchive: false,
        shouldBeInLocal: true,
        siblingIndex: 1,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [2],
        wellLabels: ["A2"],
        [WORKFLOW_ANNOTATION_NAME]: ["name1", "name2"],
      });
      expect(rows).to.deep.include({
        barcode: "1236",
        channelIds: [],
        file: "/path/to/file3",
        group: true,
        key: getUploadRowKey({ file: "/path/to/file3" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 3,
        positionIndexes: [1],
        scenes: [],
        shouldBeInArchive: true,
        shouldBeInLocal: false,
        siblingIndex: 2,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [1, 2, 3],
        wellLabels: ["A1", "A2", "B1"],
        [WORKFLOW_ANNOTATION_NAME]: ["name3"],
      });
    });
    it("does not show scene row if file row not expanded", () => {
      const rows = getUploadSummaryRows({
        ...mockState,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
          [getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 })]: {
            barcode: "1235",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            positionIndex: 1,
            [WELL_ANNOTATION_NAME]: [2],
          },
        }),
      });
      expect(rows.length).to.equal(1);
      expect(rows).to.deep.include({
        barcode: "1234",
        channelIds: [],
        file: "/path/to/file1",
        group: true,
        key: getUploadRowKey({ file: "/path/to/file1" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndexes: [1],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [],
        wellLabels: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });
    it("shows scene row if file row is expanded", () => {
      const rows = getUploadSummaryRows({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          expandedUploadJobRows: {
            [getUploadRowKey({ file: "/path/to/file1" })]: true,
          },
        }),
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
          [getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            positionIndex: 1,
            [WELL_ANNOTATION_NAME]: [2],
          },
        }),
      });
      expect(rows.length).to.equal(2);
      expect(rows).to.deep.include({
        barcode: "1234",
        channelIds: [],
        file: "/path/to/file1",
        group: true,
        key: getUploadRowKey({ file: "/path/to/file1" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndexes: [1],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [],
        wellLabels: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
      expect(rows).to.deep.include({
        barcode: "1234",
        channelIds: [],
        file: "/path/to/file1",
        group: false,
        key: getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndex: 1,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 1,
        [WELL_ANNOTATION_NAME]: [2],
        wellLabels: ["A2"],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });
    it("shows scene and channel only rows if file row is not present", () => {
      const rows = getUploadSummaryRows({
        ...mockState,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 })]: {
            barcode: "1234",
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 }),
            [NOTES_ANNOTATION_NAME]: [],
            positionIndex: 1,
            [WELL_ANNOTATION_NAME]: [2],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: undefined,
            channelId: 1,
          })]: {
            barcode: "1234",
            channel: mockChannel,
            file: "/path/to/file1",
            key: getUploadRowKey({
              file: "/path/to/file1",
              positionIndex: undefined,
              channelId: 1,
            }),
            [NOTES_ANNOTATION_NAME]: [],
            positionIndex: undefined,
            [WELL_ANNOTATION_NAME]: [2],
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
        key: getUploadRowKey({
          file: "/path/to/file1",
          positionIndex: undefined,
          channelId: 1,
        }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 2,
        positionIndex: undefined,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [2],
        wellLabels: ["A2"],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
      expect(rows[1]).to.deep.equal({
        barcode: "1234",
        channelIds: [],
        file: "/path/to/file1",
        group: false,
        key: getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 2,
        positionIndex: 1,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 1,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [2],
        wellLabels: ["A2"],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });
    it("handles files with channels", () => {
      const rows = getUploadSummaryRows({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          expandedUploadJobRows: {
            [getUploadRowKey({ file: "/path/to/file1" })]: true,
          },
        }),
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: undefined,
            [WELL_ANNOTATION_NAME]: [1],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: undefined,
            channelId: 1,
          })]: {
            barcode: "1234",
            channel: mockChannel,
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: undefined,
            positionIndex: undefined,
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(rows.length).to.equal(2);
      expect(rows).to.deep.include({
        barcode: "1234",
        channelIds: [1],
        file: "/path/to/file1",
        group: true,
        key: getUploadRowKey({ file: "/path/to/file1" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [1],
        wellLabels: ["A1"],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
      expect(rows).to.deep.include({
        barcode: "1234",
        channel: mockChannel,
        channelIds: [],
        file: "/path/to/file1",
        group: false,
        key: getUploadRowKey({
          file: "/path/to/file1",
          positionIndex: undefined,
          channelId: 1,
        }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndex: undefined,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 1,
        [WELL_ANNOTATION_NAME]: [],
        wellLabels: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });
    it("handles files with scenes and channels", () => {
      const rows = getUploadSummaryRows({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockSelection,
          expandedUploadJobRows: {
            [getUploadRowKey({ file: "/path/to/file1" })]: true,
            [getUploadRowKey({
              file: "/path/to/file1",
              positionIndex: 1,
            })]: true,
          },
        }),
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
          [getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            positionIndex: 1,
            [WELL_ANNOTATION_NAME]: [],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: 1,
            channelId: 1,
          })]: {
            barcode: "1234",
            channel: mockChannel,
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            positionIndex: 1,
            [WELL_ANNOTATION_NAME]: [1],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: undefined,
            channelId: 1,
          })]: {
            barcode: "1234",
            channel: mockChannel,
            file: "/path/to/file1",
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(rows.length).to.equal(4);
      expect(rows).to.deep.include({
        barcode: "1234",
        channelIds: [1],
        file: "/path/to/file1",
        group: true,
        key: getUploadRowKey({ file: "/path/to/file1" }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndexes: [1],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 0,
        [WELL_ANNOTATION_NAME]: [],
        wellLabels: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
      expect(rows).to.deep.include({
        barcode: "1234",
        channelIds: [],
        file: "/path/to/file1",
        group: true,
        key: getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 2,
        positionIndex: 1,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 1,
        subImageNames: [],
        treeDepth: 1,
        [WELL_ANNOTATION_NAME]: [],
        wellLabels: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
      expect(rows).to.deep.include({
        barcode: "1234",
        channel: mockChannel,
        channelIds: [],
        file: "/path/to/file1",
        group: false,
        key: getUploadRowKey({
          file: "/path/to/file1",
          positionIndex: 1,
          channelId: 1,
        }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 1,
        positionIndex: 1,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 2,
        [WELL_ANNOTATION_NAME]: [1],
        wellLabels: ["A1"],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
      expect(rows).to.deep.include({
        barcode: "1234",
        channel: mockChannel,
        channelIds: [],
        file: "/path/to/file1",
        group: false,
        key: getUploadRowKey({
          file: "/path/to/file1",
          positionIndex: undefined,
          channelId: 1,
        }),
        [NOTES_ANNOTATION_NAME]: undefined,
        numberSiblings: 2,
        positionIndexes: [],
        scenes: [],
        siblingIndex: 0,
        subImageNames: [],
        treeDepth: 1,
        [WELL_ANNOTATION_NAME]: [],
        wellLabels: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });
    it("does not throw error for annotations that don't exist on the template", () => {
      const file = "/path/to/file1";
      const getRows = () =>
        getUploadSummaryRows({
          ...nonEmptyStateForInitiatingUpload,
          template: getMockStateWithHistory({
            ...mockState.template.present,
            appliedTemplate: {
              ...mockAuditInfo,
              annotations: [mockFavoriteColorAnnotation],
              name: "foo",
              [NOTES_ANNOTATION_NAME]: [],
              templateId: 1,
              version: 1,
            },
          }),
          upload: getMockStateWithHistory({
            [getUploadRowKey({ file })]: {
              barcode: "1234",
              favoriteColor: "Red",
              file,
              [NOTES_ANNOTATION_NAME]: [],
              somethingUnexpected: "Hello World",
              [WELL_ANNOTATION_NAME]: [],
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
          [getUploadRowKey({ file })]: {
            age: undefined,
            barcode: "abcd",
            file,
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(result[file]).to.deep.equal({
        age: false,
        barcode: true,
        file: true,
        [NOTES_ANNOTATION_NAME]: false,
        shouldBeInArchive: true,
        shouldBeInLocal: true,
        [WELL_ANNOTATION_NAME]: false,
        wellLabels: false,
      });
    });

    it("sets annotation to true if one of the dimensions has that annotation set for a file", () => {
      const result = getFileToAnnotationHasValueMap({
        ...mockState,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file })]: {
            age: undefined,
            barcode: "abcd",
            file,
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
          [getUploadRowKey({ file, positionIndex: 1 })]: {
            age: undefined,
            barcode: "abcd",
            file,
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [1],
          },
          [getUploadRowKey({ file, positionIndex: 1, channelId: 1 })]: {
            age: 19,
            barcode: "abcd",
            file,
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(result[file]).to.deep.equal({
        age: true,
        barcode: true,
        file: true,
        [NOTES_ANNOTATION_NAME]: false,
        [WELL_ANNOTATION_NAME]: true,
        wellLabels: true,
      });
    });
  });

  describe("getUploadKeyToAnnotationErrorMap", () => {
    const uploadRowKey = getUploadRowKey({ file: "/path/to/file1" });
    let goodUploadRow: UploadMetadataRow;
    const getValidations = (
      annotationToTest: TemplateAnnotation,
      value: any
    ) => {
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
        Cas9: ["spCas9"],
        "Clone Number Garbage": [1, 2, 3],
        Dropdown: [],
        Qc: [false],
        barcode: "",
        file: "/path/to/file3",
        [NOTES_ANNOTATION_NAME]: [],
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
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
    it("sets error if a lookup annotation contains a value that is not an annotation option", () => {
      const result = getValidations(mockLookupAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockLookupAnnotation.name]:
            "BAD did not match any of the expected values: spCas9, Not Recorded",
        },
      });
    });
    it("sets error if a dropdown annotation contains a value that is not a dropdown option", () => {
      const result = getValidations(mockDropdownAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockDropdownAnnotation.name]:
            "BAD did not match any of the expected values: A, B, C, D",
        },
      });
    });
    it("sets error if a boolean annotation contains a value that is not a boolean", () => {
      const result = getValidations(mockBooleanAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockBooleanAnnotation.name]:
            "BAD did not match expected type: YesNo",
        },
      });
    });
    it("sets error if a text annotation contains a value that is not text", () => {
      const result = getValidations(mockTextAnnotation, [1]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockTextAnnotation.name]: "1 did not match expected type: Text",
        },
      });
    });
    it("sets error if a number annotation contains a value that is not number", () => {
      const result = getValidations(mockNumberAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockNumberAnnotation.name]:
            "BAD did not match expected type: Number",
        },
      });
    });
    it("sets error if a date annotation contains a value that is not date", () => {
      const result = getValidations(mockDateAnnotation, ["1-20"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockDateAnnotation.name]:
            "1-20 did not match expected type: Date or DateTime",
        },
      });
    });
    it("sets error if a datetime annotation contains a value that is not datetime", () => {
      const result = getValidations(mockDateTimeAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockDateTimeAnnotation.name]:
            "BAD did not match expected type: Date or DateTime",
        },
      });
    });
  });

  describe("getUploadFiles", () => {
    it("returns a unique set of files to be uploaded", () => {
      const result = getUploadFiles({
        ...nonEmptyStateForInitiatingUpload,
      });
      expect(result.sort()).to.deep.equal([
        "/path/to/file1",
        "/path/to/file2",
        "/path/to/file3",
      ]);
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
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file" }),
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: false,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      expect(result).to.be.false;
    });
  });

  describe("getUploadValidationErrors", () => {
    it("adds error if template not applied", () => {
      const errors = getUploadValidationErrors(mockState);
      expect(errors.includes("A template must be selected to submit an upload"))
        .to.be.true;
    });
    it("adds error if no files to upload", () => {
      const errors = getUploadValidationErrors({
        ...mockState,
        upload: getMockStateWithHistory({}),
      });
      expect(errors.includes("No files to upload")).to.be.true;
    });
    it("adds error if a row does not have a well or workflow annotation", () => {
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "foo" })]: {
            barcode: "abc",
            file: "foo",
            key: getUploadRowKey({ file: "foo" }),
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(
        errors.includes("foo must have either a well or workflow association")
      ).to.be.true;
    });
    it("adds error if row is missing an annotation value that is required", () => {
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "foo" })]: {
            "Favorite Color": undefined,
            barcode: "abc",
            file: "foo",
            key: getUploadRowKey({ file: "foo" }),
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(
        errors.includes(
          '"foo" is missing the following required annotations: Favorite Color'
        )
      ).to.be.true;
    });
    it("adds error if an annotation value is not formatted correctly", () => {
      const file = "foo";
      const key = getUploadRowKey({ file });
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [key]: {
            "Favorite Color": "red",
            barcode: "1234",
            file,
            key,
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      expect(
        errors.includes(
          "Unexpected format for annotation type. Hover red x icons for more information."
        )
      ).to.be.true;
    });
  });
});
