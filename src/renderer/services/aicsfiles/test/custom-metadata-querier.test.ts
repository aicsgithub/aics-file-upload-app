import { expect } from "chai";
import * as Logger from "js-logger";
import { SinonStubbedInstance, createStubInstance, restore } from "sinon";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import LabkeyClient from "../../labkey-client";
import MMSClient from "../../mms-client";
import { CustomMetadataQuerier } from "../helpers/custom-metadata-querier";
import { FileMetadata, FileToFileMetadata, ImageModelMetadata } from "../types";

import {
  mockCustomFileMetadata,
  mockFiles,
  mockLabKeyFileMetadata,
} from "./mocks";

describe("CustomMetadataQuerier", () => {
  let mockFileMetadata: FileMetadata;
  let mockFileToFileMetadata: FileToFileMetadata;
  let mockImageModelMetadata: ImageModelMetadata;
  const wellAnnotationId = 5;
  const cloneAnnotationId = 6;
  let lk: SinonStubbedInstance<LabkeyClient>;
  let mms: SinonStubbedInstance<MMSClient>;
  let querier: CustomMetadataQuerier;

  beforeEach(() => {
    lk = createStubInstance(LabkeyClient);
    mms = createStubInstance(MMSClient);
    querier = new CustomMetadataQuerier(
      (mms as any) as MMSClient,
      (lk as any) as LabkeyClient,
      Logger
    );
    const Words = ["peas", "carrots", "celery"];
    mockFileMetadata = {
      fileId: "abc123",
      annotations: [
        { annotationId: 1, values: [true] },
        { annotationId: 2, values: Words },
        { annotationId: 3, values: ["2020-02-03"] },
        { annotationId: 4, values: ["2020-02-03 12:04:10"] },
      ],
      modified: "sometime",
      modifiedBy: "seanm",
      filename: "example.txt",
      fileSize: 1,
      fileType: "image",
      templateId: 2,
    };

    mockFileToFileMetadata = {
      abc123: mockFileMetadata,
    };

    mockImageModelMetadata = {
      channelId: undefined,
      fileId: "abc123",
      fovId: undefined,
      modified: "sometime",
      modifiedBy: "seanm",
      fileSize: 1,
      fileType: "image",
      filename: "example.txt",
      "Is Qc": [true],
      positionIndex: undefined,
      scene: undefined,
      subImageName: undefined,
      "Seeded Date": [new Date("2020-02-03")],
      "Seeded Datetime": [new Date("2020-02-03 12:04:10")],
      Words,
    };
  });

  afterEach(() => restore());

  describe("innerJoinResults", () => {
    it("returns matching files", () => {
      const result1: FileToFileMetadata = {
        abc123: mockFileMetadata,
        def456: mockFileMetadata,
      };
      const result2: FileToFileMetadata = {
        abc123: mockFileMetadata,
        def456: mockFileMetadata,
      };
      const response = CustomMetadataQuerier.innerJoinResults(result1, result2);
      expect(response).to.deep.equal({
        abc123: mockFileMetadata,
        def456: mockFileMetadata,
      });
    });
    it("returns partially matching files", () => {
      const result1: FileToFileMetadata = {
        abc123: mockFileMetadata,
        def456: mockFileMetadata,
      };
      const result2: FileToFileMetadata = {
        abc123: mockFileMetadata,
        ghi789: mockFileMetadata,
      };
      const response = CustomMetadataQuerier.innerJoinResults(result1, result2);
      expect(response).to.deep.equal({ abc123: mockFileMetadata });
    });
    it("returns no matching files", () => {
      const result1: FileToFileMetadata = { abc123: mockFileMetadata };
      const result2: FileToFileMetadata = { def456: mockFileMetadata };
      const response = CustomMetadataQuerier.innerJoinResults(result1, result2);
      expect(response).to.deep.equal({});
    });
    it("returns empty result when second result is empty", () => {
      const result1: FileToFileMetadata = { abc123: mockFileMetadata };
      const result2: FileToFileMetadata = {};
      const response = CustomMetadataQuerier.innerJoinResults(result1, result2);
      expect(response).to.deep.equal({});
    });
    it("returns empty result when first result is empty", () => {
      const result1: FileToFileMetadata = {};
      const result2: FileToFileMetadata = { abc123: mockFileMetadata };
      const response = CustomMetadataQuerier.innerJoinResults(result1, result2);
      expect(response).to.deep.equal({});
    });
  });

  describe("queryByUser", () => {
    it("returns files found", async () => {
      lk.selectRowsAsList.resolves(mockFiles);
      lk.selectFirst.resolves(mockLabKeyFileMetadata);
      mms.getFileMetadata.resolves(
        (mockCustomFileMetadata as any) as FileMetadata
      );

      const response = await querier.queryByUser("fake_user");
      expect(response).to.deep.equal({
        abc123: {
          ...mockCustomFileMetadata,
          ...mockLabKeyFileMetadata,
        },
      });
    });
    it("returns empty array", async () => {
      lk.selectRowsAsList.resolves([]);

      const response = await querier.queryByUser("fake_user");
      expect(response).to.be.empty;
    });
  });

  describe("queryByTemplate", () => {
    it("returns files found", async () => {
      lk.selectRowsAsList.resolves(mockFiles);
      lk.selectFirst.resolves(mockLabKeyFileMetadata);
      mms.getFileMetadata.resolves(
        (mockCustomFileMetadata as any) as FileMetadata
      );

      const response = await querier.queryByTemplate(1);
      expect(response).to.deep.equal({
        abc123: {
          ...mockCustomFileMetadata,
          ...mockLabKeyFileMetadata,
        },
      });
    });
    it("returns empty array", async () => {
      lk.selectRowsAsList.resolves([]);

      const response = await querier.queryByTemplate(1);
      expect(response).to.be.empty;
    });
  });

  describe("transformFileMetadataIntoTable", () => {
    beforeEach(() => {
      const mockTemplates: any[] = [
        { templateId: 1, name: "Not this" },
        { templateId: 2, name: "special template" },
      ];
      const mockAnnotations: any[] = [
        {
          annotationId: 1,
          "annotationTypeId/Name": "YesNo",
          name: "Is Qc",
        },
        {
          annotationId: 2,
          "annotationTypeId/Name": "Text",
          name: "Words",
        },
        {
          annotationId: 3,
          "annotationTypeId/Name": "Date",
          name: "Seeded Date",
        },
        {
          annotationId: 4,
          "annotationTypeId/Name": "DateTime",
          name: "Seeded Datetime",
        },
        {
          annotationId: cloneAnnotationId,
          "annotationTypeId/Name": "Number",
          name: "Clones",
        },
        {
          annotationId: wellAnnotationId,
          "annotationTypeId/Name": "Lookup",
          name: WELL_ANNOTATION_NAME,
        },
        {
          annotationId: 7,
          "annotationTypeId/Name": "Duration",
          name: "Interval",
        },
      ];
      lk.selectRowsAsList
        .onCall(0)
        .resolves(mockTemplates)
        .onCall(1)
        .resolves(mockAnnotations);
    });

    it("transforms metadata into more useful table form", async () => {
      const response = await querier.transformFileMetadataIntoTable(
        mockFileToFileMetadata
      );
      expect(response).to.deep.equal([
        {
          ...mockImageModelMetadata,
          template: "special template",
          templateId: 2,
        },
      ]);
    });
    it("throws error when annotation id not found", () => {
      return expect(
        querier.transformFileMetadataIntoTable({
          abc123: {
            ...mockFileMetadata,
            annotations: [
              {
                annotationId: 100,
                values: ["unknown annotation"],
              },
            ],
          },
        })
      ).to.be.rejectedWith(Error);
    });
    it("returns empty array given empty metadata", async () => {
      const response = await querier.transformFileMetadataIntoTable({});
      expect(response).to.be.empty;
    });
    it("can handle duplicate image model annotations", async () => {
      const response = await querier.transformFileMetadataIntoTable({
        abc123: {
          ...mockFileMetadata,
          annotations: [
            ...mockFileMetadata.annotations,
            { annotationId: 4, values: ["2020-02-04 12:04:10"] },
          ],
        },
      });
      expect(response).to.deep.equal([
        {
          ...mockImageModelMetadata,
          "Seeded Datetime": [
            new Date("2020-02-03 12:04:10"),
            new Date("2020-02-04 12:04:10"),
          ],
          template: "special template",
          templateId: 2,
        },
      ]);
    });
    it("transforms date strings to dates", async () => {
      const response = await querier.transformFileMetadataIntoTable(
        mockFileToFileMetadata
      );
      expect(response).to.deep.equal([
        {
          ...mockImageModelMetadata,
          "Seeded Date": [new Date("2020-02-03")],
          "Seeded Datetime": [new Date("2020-02-03 12:04:10")],
          template: "special template",
          templateId: 2,
        },
      ]);
    });
    it("ensures values for Well annotation are integers", async () => {
      mockFileMetadata.annotations = [
        { annotationId: wellAnnotationId, values: ["1", "2"] },
      ];
      const response = await querier.transformFileMetadataIntoTable(
        mockFileToFileMetadata
      );
      expect(response).to.deep.equal([
        {
          channelId: undefined,
          fileId: "abc123",
          fovId: undefined,
          modified: "sometime",
          modifiedBy: "seanm",
          fileSize: 1,
          fileType: "image",
          filename: "example.txt",
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
          template: "special template",
          templateId: 2,
          [WELL_ANNOTATION_NAME]: [1, 2],
        },
      ]);
    });
    it("ensures values for number annotations are numbers", async () => {
      mockFileMetadata.annotations = [
        { annotationId: cloneAnnotationId, values: ["2", "4"] },
      ];
      const response = await querier.transformFileMetadataIntoTable(
        mockFileToFileMetadata
      );
      expect(response).to.deep.equal([
        {
          channelId: undefined,
          Clones: [2, 4],
          fileId: "abc123",
          fovId: undefined,
          modified: "sometime",
          modifiedBy: "seanm",
          fileSize: 1,
          fileType: "image",
          filename: "example.txt",
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
          template: "special template",
          templateId: 2,
        },
      ]);
    });
    it("transforms durations from milliseconds to objects", async () => {
      const metadata: FileMetadata = {
        fileId: "abc123",
        annotations: [
          {
            annotationId: 7,
            values: ["356521111"],
          },
        ],
        modified: "sometime",
        modifiedBy: "seanm",
        filename: "example.txt",
        fileSize: 1,
        fileType: "image",
      };

      const result = await querier.transformFileMetadataIntoTable({
        abc123: metadata,
      });

      expect(result[0].Interval[0]).to.deep.equal({
        days: 4,
        hours: 3,
        minutes: 2,
        seconds: 1.111,
      });
    });

    it("transforms durations from milliseconds to objects for large values", async () => {
      const metadata: FileMetadata = {
        fileId: "abc123",
        annotations: [
          {
            annotationId: 7,
            values: ["172800000000"],
          },
        ],
        modified: "sometime",
        modifiedBy: "seanm",
        filename: "example.txt",
        fileSize: 1,
        fileType: "image",
      };

      const result = await querier.transformFileMetadataIntoTable({
        abc123: metadata,
      });

      expect(result[0].Interval[0]).to.deep.equal({
        days: 2000,
        hours: 0,
        minutes: 0,
        seconds: 0,
      });
    });
  });
});
