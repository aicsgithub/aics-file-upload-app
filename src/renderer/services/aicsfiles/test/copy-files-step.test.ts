import { exists as fsExists, mkdir as fsMkdir } from "fs";
import { promisify } from "util";

import { expect } from "chai";
import * as Logger from "js-logger";
import { pick } from "lodash";
import * as rimraf from "rimraf";
import { createSandbox, match, SinonStub, stub } from "sinon";

import { JSSJobStatus } from "../../job-status-client/types";
import { AICSFILES_LOGGER } from "../constants";
import { CopyError } from "../errors";
import { CopyFilesStep } from "../steps/copy-files-step";
import { UploadContext } from "../types";

import {
  copyChildJobId1,
  copyChildJobId2,
  jobStatusClient,
  mockCopyJobChild1,
  mockCopyJobChild2,
  mockJob,
  sourceFiles,
  startUploadResponse,
  targetDir,
  targetFile1,
  targetFile2,
  upload1,
  upload2,
  uploadJobId,
  uploads,
} from "./mocks";

const exists = promisify(fsExists);
const mkdir = promisify(fsMkdir);

describe("CopyFilesStep", () => {
  const sandbox = createSandbox();
  let updateJobStub: SinonStub, copyStep: CopyFilesStep, mockCtx: UploadContext;

  beforeEach(() => {
    mockCtx = {
      copyChildJobs: [mockCopyJobChild1, mockCopyJobChild2],
      startUploadResponse,
      uploadJobName: "arbitrary name",
      uploads,
    };
    updateJobStub = stub().resolves();
    sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
    const logger = Logger.get(AICSFILES_LOGGER);
    sandbox.replace(logger, "error", stub());
    copyStep = new CopyFilesStep(mockJob, jobStatusClient, logger);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("start", () => {
    beforeEach(async () => {
      // setup target directory for uploading files
      // usually FSS does this but we are stubbing it
      await mkdir(targetDir);
    });

    afterEach(() => {
      rimraf.sync(targetDir);
    });

    it("populates sourceFiles", async () => {
      const ctx = await copyStep.start(mockCtx);
      expect(ctx.sourceFiles).to.deep.equal(sourceFiles);
    });
    it("copies files to uploadDirectory", async () => {
      await copyStep.start(mockCtx);
      expect(await exists(targetFile1)).to.be.true;
      expect(await exists(targetFile2)).to.be.true;
    });
    it("updates child copy job as succeeded if copied successfully", async () => {
      await copyStep.start(mockCtx);
      expect(
        updateJobStub.calledWith(
          copyChildJobId1,
          match.has("status", "SUCCEEDED")
        )
      ).to.be.true;
      expect(
        updateJobStub.calledWith(
          copyChildJobId2,
          match.has("status", "SUCCEEDED")
        )
      ).to.be.true;
    });
    it("updates child copy job as failed if copy failed", async () => {
      await expect(
        copyStep.start({
          ...mockCtx,
          startUploadResponse: {
            jobId: uploadJobId,
            uploadDirectory: "/shouldntexist",
          },
        })
      ).to.be.rejectedWith(CopyError);

      expect(updateJobStub).to.have.been.calledWithMatch("copyChildJobId1", {
        status: "FAILED",
      });
    });
    it("throws error if copyChildJobs is missing from context", () => {
      return expect(
        copyStep.start({
          ...mockCtx,
          copyChildJobs: undefined,
        })
      ).to.be.rejectedWith(Error);
    });
    it("if retrying this step, picks up where it left off", async () => {
      const ctx = {
        ...mockCtx,
        copyChildJobs: [
          {
            jobId: "copyJobChildId1",
            serviceFields: {
              originalPath: "/fake/path1",
              output: {
                "/fake/path1": {
                  name: "anything",
                },
              },
            },
            status: "SUCCEEDED" as JSSJobStatus,
          },
          {
            jobId: "copyJobChildId2",
            serviceFields: {
              originalPath: upload1,
            },
            status: "FAILED" as JSSJobStatus,
          },
          {
            jobId: "copyJobChildId3",
            serviceFields: {
              originalPath: upload1,
              output: {
                "/fake/path2": {
                  name: "anything",
                },
              },
            },
            status: "SUCCEEDED" as JSSJobStatus,
          },
          {
            jobId: "copyJobChildId4",
            serviceFields: {
              originalPath: upload2,
            },
            status: "WAITING" as JSSJobStatus,
          },
        ],
      };

      const updatedCtx = await copyStep.start(ctx);

      expect(updatedCtx.sourceFiles).to.not.be.undefined;
      if (updatedCtx.sourceFiles) {
        expect(updatedCtx.sourceFiles["/fake/path1"]).to.not.be.undefined;
        expect(updatedCtx.sourceFiles["/fake/path2"]).to.not.be.undefined;
        expect(updatedCtx.sourceFiles[upload1]).to.not.be.undefined;
        expect(updatedCtx.sourceFiles[upload2]).to.not.be.undefined;
      }
    });
  });

  describe("skip", () => {
    it("populates sourceFiles given enough information in copyChildJobs", async () => {
      const ctx = await copyStep.skip({
        ...mockCtx,
        copyChildJobs: [
          {
            ...mockCopyJobChild1,
            status: "SUCCEEDED" as JSSJobStatus,
            jobId: copyChildJobId1,
            serviceFields: {
              originalPath: upload1,
              output: pick(sourceFiles, upload1),
            },
          },
          {
            ...mockCopyJobChild1,
            jobId: copyChildJobId2,
            status: "SUCCEEDED" as JSSJobStatus,
            serviceFields: {
              originalPath: upload2,
              output: pick(sourceFiles, upload2),
            },
          },
        ],
      });
      expect(ctx.sourceFiles).to.deep.equal(sourceFiles);
    });
    it("throws error if child copy jobs do not contain output needed to populate context", () => {
      return expect(copyStep.skip(mockCtx)).to.be.rejectedWith(Error);
    });
  });

  describe("end", () => {
    it("updates the job for copy", async () => {
      sandbox.replace(copyStep, "job", mockCopyJobChild1);
      await copyStep.end({
        ...mockCtx,
        sourceFiles,
      });
      expect(
        updateJobStub.calledWith(
          mockCopyJobChild1.jobId,
          match
            .has("status", "SUCCEEDED")
            .and(match.has("serviceFields", match.has("output", sourceFiles)))
        )
      ).to.be.true;
    });

    it("throws error if sourceFiles is missing from context", () => {
      sandbox.replace(copyStep, "job", mockCopyJobChild1);
      return expect(copyStep.end(mockCtx)).to.be.rejectedWith(Error);
    });
  });
});
