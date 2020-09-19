import { expect } from "chai";
import { createSandbox, match, SinonStub, stub } from "sinon";

import { JSSJobStatus } from "../../job-status-client/types";
import { IllegalArgumentError } from "../errors";
import { AddMetadataStep } from "../steps/add-metadata-step";
import { UploadContext } from "../types";

import {
  addMetadataResponse,
  fss,
  jobStatusClient,
  mockJob,
  resultFiles,
  sourceFiles,
  startUploadResponse,
  uploads,
} from "./mocks";

describe("AddMetadataStep", () => {
  const sandbox = createSandbox();
  let mockCtx: UploadContext,
    updateJobStub: SinonStub,
    addMetadataStep: AddMetadataStep;

  beforeEach(() => {
    updateJobStub = stub().resolves();
    sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
    mockCtx = {
      sourceFiles,
      startUploadResponse,
      uploadJobName: "arbitrary name",
      uploads,
    };
    addMetadataStep = new AddMetadataStep(mockJob, fss, jobStatusClient);
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
      sandbox.replace(
        fss,
        "uploadComplete",
        stub().resolves(addMetadataResponse)
      );
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
          type: "add-metadata",
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
        updateJobStub.calledWith(
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
