import { expect } from "chai";
import * as Logger from "js-logger";
import { pick } from "lodash";
import {
  createSandbox,
  match,
  SinonStubbedInstance,
  stub,
  createStubInstance,
  SinonStub,
} from "sinon";

import JobStatusClient from "../../job-status-client";
import { JSSJobStatus } from "../../job-status-client/types";
import { AICSFILES_LOGGER, UPLOAD_WORKER_SUCCEEDED } from "../constants";
import { CopyError } from "../errors";
import { CopyFilesStep } from "../steps/copy-files-step";
import { UploadContext, UploadMetadata } from "../types";

import {
  copyChildJobId1,
  copyChildJobId2,
  copyWorkerStub,
  mockCopyJobChild1,
  mockCopyJobChild2,
  mockCopyJobParent,
  mockJob,
  sourceFiles,
  startUploadResponse,
  upload1,
  upload2,
  uploadJobId,
  uploads,
} from "./mocks";

describe("CopyFilesStep", () => {
  const sandbox = createSandbox();
  let copyStep: CopyFilesStep, mockCtx: UploadContext;
  let jobStatusClient: SinonStubbedInstance<JobStatusClient>;
  let fs: {
    readdir: SinonStub;
    unlink: SinonStub;
  };

  beforeEach(() => {
    mockCtx = {
      copyChildJobs: [mockCopyJobChild1, mockCopyJobChild2],
      startUploadResponse,
      uploadJobName: "arbitrary name",
      uploads,
    };
    jobStatusClient = createStubInstance(JobStatusClient);
    const logger = Logger.get(AICSFILES_LOGGER);
    sandbox.replace(logger, "error", stub());
    fs = {
      readdir: stub().resolves([]),
      unlink: stub().resolves(),
    };
    copyStep = new CopyFilesStep(
      mockCopyJobParent,
      (jobStatusClient as any) as JobStatusClient,
      stub().returns(copyWorkerStub),
      logger,
      undefined,
      undefined,
      fs
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("start", () => {
    // The copy step won't complete until onmessage is called off of the worker
    // Since the worker is a stub, we need to fake its behavior by immediately calling onmessage once postMessage is called.
    const fakeSuccessfulCopy = () => {
      copyWorkerStub.postMessage.callsFake(() => {
        copyWorkerStub.onmessage({
          data: `${UPLOAD_WORKER_SUCCEEDED}:somemd5`,
        });
      });
    };

    it("removes unexpected files from upload directory", async () => {
      fakeSuccessfulCopy();
      fs.readdir = stub().resolves(["unexpected-file.txt"]);
      await copyStep.start(mockCtx);
      expect(fs.unlink).to.have.been.called;
    });
    it("populates sourceFiles", async () => {
      fakeSuccessfulCopy();
      const ctx = await copyStep.start(mockCtx);
      expect(ctx.sourceFiles).to.deep.equal(sourceFiles);
    });
    it("updates child copy job as succeeded if copied successfully", async () => {
      fakeSuccessfulCopy();
      await copyStep.start(mockCtx);
      expect(
        jobStatusClient.updateJob.calledWith(
          copyChildJobId1,
          match.has("status", JSSJobStatus.SUCCEEDED)
        )
      ).to.be.true;
      expect(
        jobStatusClient.updateJob.calledWith(
          copyChildJobId2,
          match.has("status", JSSJobStatus.SUCCEEDED)
        )
      ).to.be.true;
    });
    it("updates child copy job as failed if copy failed", async () => {
      // Here we're faking a copy error by having our worker stub immediately call onerror once postMessage is called
      copyWorkerStub.postMessage.callsFake(() => {
        copyWorkerStub.onerror("random error");
      });
      await expect(
        copyStep.start({
          ...mockCtx,
          startUploadResponse: {
            jobId: uploadJobId,
            uploadDirectory: "/shouldntexist",
          },
        })
      ).to.be.rejectedWith(CopyError);

      expect(jobStatusClient.updateJob).to.have.been.calledWithMatch(
        "copyChildJobId1",
        {
          status: JSSJobStatus.FAILED,
        }
      );
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
      fakeSuccessfulCopy();
      const ctx: UploadContext = {
        ...mockCtx,
        copyChildJobs: [
          {
            ...mockJob,
            jobId: "copyJobChildId1",
            serviceFields: {
              originalPath: "/fake/path1",
              output: {
                "/fake/path1": {
                  fileName: "anything",
                  md5hex: "string",
                  fileType: "image",
                  metadata: {} as UploadMetadata,
                },
              },
              totalBytes: 1,
              type: "copy",
            },
            status: JSSJobStatus.SUCCEEDED,
          },
          {
            ...mockJob,
            jobId: "copyJobChildId2",
            serviceFields: {
              originalPath: upload1,
              totalBytes: 1,
              type: "copy",
            },
            status: JSSJobStatus.FAILED,
          },
          {
            ...mockJob,
            jobId: "copyJobChildId3",
            serviceFields: {
              originalPath: upload1,
              output: {
                "/fake/path2": {
                  fileName: "anything",
                  md5hex: "string",
                  fileType: "image",
                  metadata: {} as UploadMetadata,
                },
              },
              totalBytes: 1,
              type: "copy",
            },
            status: JSSJobStatus.SUCCEEDED,
          },
          {
            ...mockJob,
            jobId: "copyJobChildId4",
            serviceFields: {
              originalPath: upload2,
              totalBytes: 1,
              type: "copy",
            },
            status: JSSJobStatus.WAITING,
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
            status: JSSJobStatus.SUCCEEDED,
            jobId: copyChildJobId1,
            serviceFields: {
              originalPath: upload1,
              output: pick(sourceFiles, upload1),
              totalBytes: 1,
              type: "copy",
            },
          },
          {
            ...mockCopyJobChild1,
            jobId: copyChildJobId2,
            status: JSSJobStatus.SUCCEEDED,
            serviceFields: {
              originalPath: upload2,
              output: pick(sourceFiles, upload2),
              totalBytes: 1,
              type: "copy",
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
      await copyStep.end({
        ...mockCtx,
        sourceFiles,
      });
      expect(
        jobStatusClient.updateJob.calledWith(
          mockCopyJobParent.jobId,
          match
            .has("status", JSSJobStatus.SUCCEEDED)
            .and(match.has("serviceFields", match.has("output", sourceFiles))),
          true
        )
      ).to.be.true;
    });

    it("throws error if sourceFiles is missing from context", () => {
      sandbox.replace(copyStep, "job", mockCopyJobParent);
      return expect(copyStep.end(mockCtx)).to.be.rejectedWith(Error);
    });
  });
});
