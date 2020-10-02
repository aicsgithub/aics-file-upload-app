import { expect } from "chai";
import {
  createSandbox,
  createStubInstance,
  match,
  SinonStubbedInstance,
} from "sinon";

import JobStatusClient from "../../job-status-client";
import { JSSJobStatus } from "../../job-status-client/types";
import { IllegalArgumentError } from "../errors";
import { FSSClient } from "../helpers/fss-client";
import { AddMetadataStep } from "../steps/add-metadata-step";
import { UploadContext } from "../types";

import {
  addMetadataResponse,
  mockJob,
  resultFiles,
  sourceFiles,
  startUploadResponse,
  uploads,
} from "./mocks";

describe("AddMetadataStep", () => {
  const sandbox = createSandbox();
  let mockCtx: UploadContext, addMetadataStep: AddMetadataStep;
  let jobStatusClient: SinonStubbedInstance<JobStatusClient>;
  let fss: SinonStubbedInstance<FSSClient>;

  beforeEach(() => {
    jobStatusClient = createStubInstance(JobStatusClient);
    fss = createStubInstance(FSSClient);
    mockCtx = {
      sourceFiles,
      startUploadResponse,
      uploadJobName: "arbitrary name",
      uploads,
    };
    addMetadataStep = new AddMetadataStep(
      mockJob,
      (fss as any) as FSSClient,
      (jobStatusClient as any) as JobStatusClient
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("start", () => {
    it("throws error if sourceFiles is empty", async () => {
      await expect(
        addMetadataStep.start({
          ...mockCtx,
          sourceFiles: {},
        })
      ).to.be.rejectedWith(IllegalArgumentError);
    });
    it("populates resultFiles", async () => {
      fss.uploadComplete.resolves(addMetadataResponse);
      const ctx = await addMetadataStep.start(mockCtx);
      expect(ctx.resultFiles).to.equal(addMetadataResponse.files);
    });
  });

  describe("skip", () => {
    it("populates resultFiles", async () => {
      sandbox.replace(addMetadataStep, "job", {
        ...mockJob,
        serviceFields: {
          output: resultFiles,
          type: "add_metadata",
        },
      });
      const ctx = await addMetadataStep.skip(mockCtx);
      expect(ctx.resultFiles).to.equal(resultFiles);
    });
    it("throws error if job is undefined", async () => {
      await expect(addMetadataStep.skip(mockCtx)).to.be.rejectedWith(Error);
    });
    it("throws error if job does not contain enough information", () => {
      sandbox.replace(addMetadataStep, "job", mockJob);
      return expect(addMetadataStep.skip(mockCtx)).to.be.rejectedWith(Error);
    });
  });

  describe("end", () => {
    it("updates the job for add metadata", async () => {
      sandbox.replace(addMetadataStep, "job", mockJob);
      await addMetadataStep.end({ ...mockCtx, resultFiles: resultFiles });
      expect(
        jobStatusClient.updateJob.calledWith(
          mockJob.jobId,
          match
            .has("status", JSSJobStatus.SUCCEEDED)
            .and(match.has("serviceFields", match.has("output", match.array)))
        )
      ).to.be.true;
    });

    it("throws error if context is missing resultFiles", () => {
      sandbox.replace(addMetadataStep, "job", mockJob);
      return expect(
        addMetadataStep.end({ ...mockCtx, resultFiles: undefined })
      ).to.be.rejectedWith(Error);
    });
  });
});
