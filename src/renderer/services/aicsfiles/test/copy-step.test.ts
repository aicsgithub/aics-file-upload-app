import {
  exists as fsExists,
  rmdir as fsRmdir,
  unlink as fsUnlink,
  mkdir as fsMkdir,
} from "fs";
import { resolve } from "path";
import { promisify } from "util";

import { expect } from "chai";
import * as Logger from "js-logger";
import { pick } from "lodash";
import * as rimraf from "rimraf";
import { createSandbox, match, SinonStub, spy, stub, SinonSpy } from "sinon";

import { CopyStep } from "../steps/copy-step";
import { UploadContext } from "../types";

import {
  copyChildJobId1,
  jobStatusClient,
  mockCopyJobChild1,
  mockCopyJobChild2,
  sourceFiles,
  startUploadResponse,
  targetDir,
  targetFile1,
  upload1,
  uploadJobId,
  uploads,
} from "./mocks";

const exists: (path: string) => Promise<boolean> = promisify(fsExists);
const mkdir = promisify(fsMkdir);
const rmdir = promisify(fsRmdir);
const unlink = promisify(fsUnlink);

describe("CopyStep", () => {
  const sandbox = createSandbox();
  let updateJobStub: SinonStub;
  let copyStep: CopyStep;
  let mockCtx: UploadContext;
  const rimrafSpy: SinonSpy = spy();
  const logger = Logger.get("test");

  beforeEach(() => {
    updateJobStub = stub().resolves(mockCopyJobChild1);
    sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
    sandbox.replace(logger, "error", stub());
    sandbox.replace(rimraf, "sync", rimrafSpy);
    copyStep = new CopyStep(mockCopyJobChild1, jobStatusClient, logger, rimraf);
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
    beforeEach(async () => {
      // setup target directory for uploading files
      // usually FSS does this but we are stubbing it
      await mkdir(targetDir);
    });

    afterEach(async () => {
      if (await exists(targetFile1)) {
        await unlink(targetFile1);
      }
      if (await exists(targetDir)) {
        await rmdir(targetDir);
      }
    });

    it("populates sourceFiles", async () => {
      const ctx = await copyStep.start(mockCtx);

      expect(ctx.sourceFiles).to.deep.equal(pick(sourceFiles, upload1));
    });

    it("copies file", async () => {
      await copyStep.start(mockCtx);
      const targetFileExists = await exists(targetFile1);
      expect(targetFileExists).to.be.true;
    });

    it("deletes garbage Mac files when on Mac", async () => {
      stub(process, "platform").get(() => "darwin");
      const copyStep2 = new CopyStep(
        mockCopyJobChild1,
        jobStatusClient,
        logger,
        rimraf,
        stub() // we want to stub copy in case the OS is not a Mac
      );
      await copyStep2.start(mockCtx);
      expect(rimrafSpy.calledWith(resolve(targetDir, "._mock-file.txt"))).to.be
        .true;
    });

    it("does not try to delete garbage files when on Windows", async () => {
      stub(process, "platform").get(() => "win32");
      const copyStep2 = new CopyStep(
        mockCopyJobChild1,
        jobStatusClient,
        logger,
        rimraf,
        stub() // we are testing rimraf not copy so this is a stub
      );
      await copyStep2.start(mockCtx);
      expect(rimrafSpy.calledWith(resolve(targetDir, "._mock-file.txt"))).to.be
        .false;
    });

    it("does not try to delete garbage files when on Linux", async () => {
      stub(process, "platform").get(() => "linux");
      const copyStep2 = new CopyStep(
        mockCopyJobChild1,
        jobStatusClient,
        logger,
        rimraf,
        stub() // we are testing rimraf not copy so this is a stub
      );
      await copyStep2.start(mockCtx);
      expect(rimrafSpy.calledWith(resolve(targetDir, "._mock-file.txt"))).to.be
        .false;
    });

    it("throws error if cannot copy", () => {
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
        {
          ...mockCopyJobChild1,
          serviceFields: {
            ...mockCopyJobChild1.serviceFields,
            originalPath: undefined,
          },
        },
        jobStatusClient
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
      sandbox.replace(copyStep, "job", {
        ...mockCopyJobChild1,
        serviceFields: {
          ...mockCopyJobChild1.serviceFields,
          originalPath: undefined,
        },
      });
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
            .and(match.has("status", "SUCCEEDED")),
          true
        )
      ).to.be.true;
    });
  });
});
