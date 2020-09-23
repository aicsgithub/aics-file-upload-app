import { expect } from "chai";
import * as Logger from "js-logger";
import { SinonStubbedInstance, createStubInstance } from "sinon";

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
      "Seeded Date": ["2020-02-03"],
      "Seeded Datetime": ["2020-02-03 12:04:10"],
      Words,
    };
  });
  describe("transformTableIntoCSV", () => {
    it("transforms metadata to CSV with matching columns", () => {
      const header = ["fileId", "fileTYPE", "WoRkFlOw", "words"];
      const rows = [mockImageModelMetadata];
      const response = querier.transformTableIntoCSV(header, rows);
      expect(response).to.deep.equal(
        'fileId,fileTYPE,WoRkFlOw,words\r"abc123","image",,"carrots, celery, peas"'
      );
    });
    it("transforms metadata to CSV with empty columns", () => {
      const header = ["fileId", "fileTYPE", "WoRkFlOw"];
      const rows = [mockImageModelMetadata];
      const response = querier.transformTableIntoCSV(header, rows);
      expect(response).to.deep.equal(
        'fileId,fileTYPE,WoRkFlOw\r"abc123","image",'
      );
    });
    it("transforms metadata to CSV with no rows", () => {
      const header = ["invalidColumn"];
      const rows = [mockImageModelMetadata];
      const response = querier.transformTableIntoCSV(header, rows);
      expect(response).to.deep.equal("invalidColumn\r");
    });
    it("transforms metadata to empty CSV", () => {
      const header: string[] = [];
      const rows: ImageModelMetadata[] = [];
      const response = querier.transformTableIntoCSV(header, rows);
      expect(response).to.deep.equal("");
    });
  });

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
          "Seeded Datetime": ["2020-02-03 12:04:10", "2020-02-04 12:04:10"],
          template: "special template",
          templateId: 2,
        },
      ]);
    });
    it("transforms date strings to dates if transformDates=true", async () => {
      const response = await querier.transformFileMetadataIntoTable(
        mockFileToFileMetadata,
        true
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
  });
});
