import { resolve } from "path";

import { expect } from "chai";
import * as Logger from "js-logger";
import { pick } from "lodash";
import * as rimraf from "rimraf";
import { createSandbox, match, SinonStub, spy, stub, SinonSpy } from "sinon";

import { JSSJob, JSSJobStatus } from "../../job-status-client/types";
import { UPLOAD_WORKER_SUCCEEDED } from "../constants";
import { CopyStep } from "../steps/copy-step";
import { CopyFileServiceFields, UploadContext } from "../types";

import {
  copyChildJobId1,
  copyWorkerStub,
  jobStatusClient,
  mockCopyJobChild1,
  mockCopyJobChild2,
  sourceFiles,
  startUploadResponse,
  targetDir,
  upload1,
  uploadJobId,
  uploads,
} from "./mocks";

describe("CopyStep", () => {
  const sandbox = createSandbox();
  let updateJobStub: SinonStub;
  let copyStep: CopyStep;
  let mockCtx: UploadContext;
  const rimrafSpy: SinonSpy = spy();
  const logger = Logger.get("test");
  const getCopyWorkerStub = stub().returns(copyWorkerStub);

  beforeEach(() => {
    updateJobStub = stub().resolves(mockCopyJobChild1);
    sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
    sandbox.replace(logger, "error", stub());
    sandbox.replace(rimraf, "sync", rimrafSpy);
    copyStep = new CopyStep(
      mockCopyJobChild1,
      jobStatusClient,
      getCopyWorkerStub,
      logger,
      rimraf
    );
    mockCtx = {
      copyChildJobs: [mockCopyJobChild1, mockCopyJobChild2],
      startUploadResponse: { ...startUploadResponse },
      uploadJobName: "",
      uploads,
    };
  });

  afterEach(() => {
    sandbox.restore();
    rimrafSpy.resetHistory();
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

    it("populates sourceFiles", async () => {
      fakeSuccessfulCopy();
      const ctx = await copyStep.start(mockCtx);
      expect(ctx.sourceFiles).to.deep.equal(pick(sourceFiles, upload1));
    });

    it("deletes garbage Mac files when on Mac", async () => {
      fakeSuccessfulCopy();
      stub(process, "platform").get(() => "darwin");
      const copyStep2 = new CopyStep(
        mockCopyJobChild1,
        jobStatusClient,
        getCopyWorkerStub,
        logger,
        rimraf,
        stub() // we want to stub copy in case the OS is not a Mac
      );
      await copyStep2.start(mockCtx);
      expect(rimrafSpy.calledWith(resolve(targetDir, "._mock-file.txt"))).to.be
        .true;
    });

    it("does not try to delete garbage files when on Windows", async () => {
      fakeSuccessfulCopy();
      stub(process, "platform").get(() => "win32");
      const copyStep2 = new CopyStep(
        mockCopyJobChild1,
        jobStatusClient,
        getCopyWorkerStub,
        logger,
        rimraf,
        stub() // we are testing rimraf not copy so this is a stub
      );
      await copyStep2.start(mockCtx);
      expect(rimrafSpy.calledWith(resolve(targetDir, "._mock-file.txt"))).to.be
        .false;
    });

    it("does not try to delete garbage files when on Linux", async () => {
      fakeSuccessfulCopy();
      stub(process, "platform").get(() => "linux");
      const copyStep2 = new CopyStep(
        mockCopyJobChild1,
        jobStatusClient,
        getCopyWorkerStub,
        logger,
        rimraf,
        stub() // we are testing rimraf not copy so this is a stub
      );
      await copyStep2.start(mockCtx);
      expect(rimrafSpy.calledWith(resolve(targetDir, "._mock-file.txt"))).to.be
        .false;
    });

    it("throws error if cannot copy", () => {
      // Here we fake a copy error by calling onerror as soon as postMessage is called off of the worker
      copyWorkerStub.postMessage.callsFake(() => {
        copyWorkerStub.onerror({
          data: "fake error",
        });
      });
      return expect(
        copyStep.start({
          ...mockCtx,
          startUploadResponse: {
            jobId: uploadJobId,
            uploadDirectory: "/does/not/exist",
          },
        })
      ).to.be.rejectedWith(Error);
    });

    it("throws error if job does not contain enough information", () => {
      const copyStep2 = new CopyStep(
        ({
          ...mockCopyJobChild1,
          serviceFields: {
            ...mockCopyJobChild1.serviceFields,
            totalBytes: 1200,
            type: "copy",
            originalPath: undefined,
          },
        } as any) as JSSJob<CopyFileServiceFields>,
        jobStatusClient,
        getCopyWorkerStub
      );
      return expect(copyStep2.start(mockCtx)).to.be.rejectedWith(Error);
    });
  });

  describe("skip", () => {
    it("updates upload context using information from job", async () => {
      sandbox.replace(copyStep, "job", {
        ...mockCopyJobChild1,
        serviceFields: {
          ...mockCopyJobChild1.serviceFields,
          originalPath: upload1,
          totalBytes: 1200,
          type: "copy",
          output: sourceFiles,
        },
      });
      const ctx = await copyStep.skip(mockCtx);
      expect(ctx.sourceFiles).to.equal(sourceFiles);
    });

    it("throws error if job is undefined", () => {
      expect(copyStep.skip(mockCtx)).to.be.rejectedWith(Error);
    });

    it("throws error if job does not contain enough information", () => {
      sandbox.replace(copyStep, "job", mockCopyJobChild1);
      return expect(copyStep.skip(mockCtx)).to.be.rejectedWith(Error);
    });
  });

  describe("end", () => {
    it("throws error if context does not include sourceFiles", () => {
      sandbox.replace(copyStep, "job", mockCopyJobChild1);
      return expect(copyStep.end(mockCtx)).to.be.rejectedWith(Error);
    });

    it("throws error if job is missing information", () => {
      sandbox.replace(copyStep, "job", ({
        ...mockCopyJobChild1,
        serviceFields: {
          ...mockCopyJobChild1.serviceFields,
          totalBytes: 1200,
          type: "copy",
          originalPath: undefined,
        },
      } as any) as JSSJob<CopyFileServiceFields>);
      return expect(
        copyStep.end({ ...mockCtx, sourceFiles })
      ).to.be.rejectedWith(Error);
    });

    it("updates job using information stored in context", async () => {
      sandbox.replace(copyStep, "job", mockCopyJobChild1);
      await copyStep.end({ ...mockCtx, sourceFiles });
      expect(
        updateJobStub.calledWith(
          copyChildJobId1,
          match
            .has(
              "serviceFields",
              match.has("output", pick(sourceFiles, upload1))
            )
            .and(match.has("status", JSSJobStatus.SUCCEEDED)),
          true
        )
      ).to.be.true;
    });
  });
});
