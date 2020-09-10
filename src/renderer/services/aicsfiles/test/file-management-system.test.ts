import { exists as fsExists, mkdir as fsMkdir } from "fs";
import * as path from "path";
import { promisify } from "util";

import { expect } from "chai";
import * as Logger from "js-logger";
import * as rimraf from "rimraf";
import {
  createSandbox,
  createStubInstance,
  SinonStubbedInstance,
  stub,
} from "sinon";

import JobStatusClient from "../../job-status-client";
import { JSSJob } from "../../job-status-client/types";
import { FSSConnection } from "../connections";
import { UnrecoverableJobError } from "../errors/UnrecoverableJobError";
import {
  FileManagementSystem,
  FileManagementSystemConfig,
  getDuplicateFilesError,
  getFileDoesNotExistError,
  getFilePropertyMissingError,
  getOriginalPathPropertyDoesntMatch,
  noFilesError,
} from "../file-management-system";
import { Uploader } from "../uploader";

import {
  fss,
  jobStatusClient,
  metadata1,
  metadata2,
  mockRetryableUploadJob,
  startUploadResponse,
  targetDir,
  upload1,
  upload2,
  uploads,
  mockJob,
  copyWorkerStub,
} from "./mocks";

const exists = promisify(fsExists);
const mkdir = promisify(fsMkdir);

export const differentTargetDir = path.resolve("./aics");

describe("FileManagementSystem", () => {
  let uploader: Uploader;
  const sandbox = createSandbox();
  const getCopyWorkerStub = stub().returns(copyWorkerStub);
  beforeEach(() => {
    const logger = Logger.get("test");
    sandbox.replace(logger, "error", stub());
    uploader = new Uploader(getCopyWorkerStub, fss, jobStatusClient, logger);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("constructor", () => {
    const HOST = "localhost";
    const PORT = "8080";
    const testConstructor = (config: FileManagementSystemConfig): void => {
      const fms = new FileManagementSystem(config);
      expect(fms.fss.host).to.equal(HOST);
      expect(fms.fss.port).to.equal(PORT);
      expect(fms.host).to.equal(HOST);
      expect(fms.port).to.equal(PORT);
      expect(fms.jobStatusClient.host).to.equal(HOST);
      expect(fms.jobStatusClient.port).to.equal(PORT);
      expect(fms.lk.host).to.equal(HOST);
      expect(fms.lk.port).to.equal(PORT);
      expect(fms.mms.host).to.equal(HOST);
      expect(fms.mms.port).to.equal(PORT);
      expect(fms.customMetadataQuerier.lk.host).to.equal(HOST);
      expect(fms.customMetadataQuerier.lk.port).to.equal(PORT);
      expect(fms.customMetadataQuerier.mms.host).to.equal(HOST);
      expect(fms.customMetadataQuerier.mms.port).to.equal(PORT);
    };

    it("uses host and port if provided", () => {
      testConstructor({
        getCopyWorker: getCopyWorkerStub,
        host: HOST,
        port: PORT,
      });
    });

    it("ignores host and port if fss connection and jobStatusClient provided", () => {
      testConstructor({
        getCopyWorker: getCopyWorkerStub,
        host: "wronghost",
        port: "9090",
        fss: new FSSConnection(HOST, PORT, "foo"),
        jobStatusClient: new JobStatusClient({
          host: HOST,
          port: PORT,
          username: "foo",
        }),
      });
    });

    it("allows host and port to be optional", () => {
      const fss = new FSSConnection(HOST, PORT, "foo");
      const jobStatusClient = new JobStatusClient({
        host: HOST,
        port: PORT,
        username: "foo",
      });
      testConstructor({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader: new Uploader(getCopyWorkerStub, fss, jobStatusClient),
      });
    });

    it("throws an error if no connection info provided", () => {
      // can't test for specific error due to transpilation, i.e. this known error:
      // https://github.com/chaijs/chai/issues/596
      expect(
        () => new FileManagementSystem({ getCopyWorker: getCopyWorkerStub })
      ).to.throw();
    });
  });

  describe("set port", () => {
    const fms = new FileManagementSystem({
      getCopyWorker: getCopyWorkerStub,
      host: "localhost",
      port: "80",
    });
    it("sets jobStatusClient and fss ports", () => {
      fms.port = "90";
      expect(fms.jobStatusClient.port).to.equal("90");
      expect(fms.fss.port).to.equal("90");
    });
  });

  describe("set host", () => {
    const fms = new FileManagementSystem({
      getCopyWorker: getCopyWorkerStub,
      host: "localhost",
      port: "80",
    });
    it("sets jobStatusClient and fss hosts", () => {
      fms.host = "foo";
      expect(fms.jobStatusClient.host).to.equal("foo");
      expect(fms.fss.host).to.equal("foo");
    });
  });

  describe("setMountPoint", () => {
    beforeEach(async () => {
      if (!(await exists(targetDir))) {
        await mkdir(targetDir);
      }

      if (!(await exists(differentTargetDir))) {
        await mkdir(differentTargetDir);
      }
    });

    afterEach(() => {
      rimraf.sync(targetDir);
      rimraf.sync(differentTargetDir);
    });

    const fms = new FileManagementSystem({
      getCopyWorker: getCopyWorkerStub,
      host: "localhost",
      port: "80",
    });
    it("Throws an error if mount point is an empty string", () => {
      expect(fms.setMountPoint("")).to.be.rejectedWith(Error);
    });
    it("Throws an error if mount point is a string with no characters", () => {
      expect(fms.setMountPoint("  ")).to.be.rejectedWith(Error);
    });
    it("Throws an error if mount point is not a directory", () => {
      expect(fms.setMountPoint("/does/not/exist")).to.be.rejectedWith(Error);
    });
    it("Throws an error if mount point is not a directory named aics", () => {
      expect(fms.setMountPoint(targetDir)).to.be.rejectedWith(Error);
    });
    it("Trims trailing forward slash", async () => {
      await fms.setMountPoint(differentTargetDir + "/");
      expect(fms.mountPoint).to.equal(differentTargetDir);
    });
    it("Trims trailing back slash", async () => {
      await fms.setMountPoint(differentTargetDir + "\\");
      expect(fms.mountPoint).to.equal(differentTargetDir);
    });
  });

  describe("validateMetadataAndGetUploadDirectory", () => {
    const fms = new FileManagementSystem({
      getCopyWorker: getCopyWorkerStub,
      host: "localhost",
      port: "80",
    });
    const goodMetadata = {
      [upload1]: {
        ...metadata1,
        file: {
          ...metadata1.file,
          originalPath: upload1,
        },
      },
    };

    it("Throws error if input file not found", () => {
      const metadataMap = {
        [upload1 + "foo"]: metadata1,
        [upload2]: metadata2,
      };

      expect(
        fms.validateMetadataAndGetUploadDirectory(metadataMap, "test_job_name")
      ).to.be.rejectedWith(getFileDoesNotExistError(upload1 + "foo"));
    });

    it("Throws error if input file names are the same", () => {
      const anotherUpload = path.resolve("/tmp/", path.basename(upload1));
      const metadataMap = {
        [upload1]: metadata1,
        [anotherUpload]: { ...metadata1, originalPath: anotherUpload },
      };

      expect(
        fms.validateMetadataAndGetUploadDirectory(metadataMap, "test_job_name")
      ).to.be.rejectedWith(getDuplicateFilesError(path.basename(upload1)));
    });

    it("Throws error if metadata is empty", () => {
      expect(
        fms.validateMetadataAndGetUploadDirectory({}, "test_job_name")
      ).to.be.rejectedWith(noFilesError);
    });

    it("Throws error if metadata is missing fileType property", () => {
      expect(
        fms.validateMetadataAndGetUploadDirectory(
          {
            [upload1]: {
              customMetadata: { annotations: [], templateId: 1 },
              file: { fileType: "", originalPath: upload1 },
            },
          },
          "test_job_name"
        )
      ).to.be.rejectedWith(getFilePropertyMissingError(upload1));
    });

    it("Throws error if metadata originalPath does not match filePath", () => {
      expect(
        fms.validateMetadataAndGetUploadDirectory(
          {
            [upload1]: {
              ...metadata1,
              file: {
                ...metadata1.file,
                originalPath: "/somewhere/else",
              },
            },
          },
          "test_job_name"
        )
      ).to.be.rejectedWith(
        getOriginalPathPropertyDoesntMatch(upload1, "/somewhere/else")
      );
    });

    it("Throws error if it cannot get a start upload response from FSS", () => {
      const fssStub = {
        startUpload: stub().rejects(),
      };
      sandbox.replace(fms, "fss", (fssStub as any) as FSSConnection);
      expect(
        fms.validateMetadataAndGetUploadDirectory(goodMetadata, "test_job_name")
      ).to.be.rejectedWith(Error);
    });

    it("Returns response from FSS if OK", async () => {
      const fssStub = {
        startUpload: stub().resolves(startUploadResponse),
      };
      sandbox.replace(fms, "fss", (fssStub as any) as FSSConnection);
      expect(
        await fms.validateMetadataAndGetUploadDirectory(
          goodMetadata,
          "test_job_name"
        )
      ).to.equal(startUploadResponse);
    });
  });

  describe("uploadFiles", () => {
    const sandbox = createSandbox();

    beforeEach(() => {
      sandbox.replace(
        fss,
        "uploadComplete",
        stub().resolves(startUploadResponse)
      );
      sandbox.replace(jobStatusClient, "updateJob", stub().resolves());
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("calls uploader.uploadFiles with uploads and jobName passed in", async () => {
      const uploadFilesStub = stub().resolves();
      sandbox.replace(uploader, "uploadFiles", uploadFilesStub);
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });
      await fms.uploadFiles(startUploadResponse, uploads, "anything");
      sandbox.assert.calledWith(
        uploadFilesStub,
        startUploadResponse,
        uploads,
        "anything"
      );
    });

    it("throws exception if uploader.uploadFiles throws", () => {
      sandbox.replace(uploader, "uploadFiles", stub().rejects());
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });
      expect(
        fms.uploadFiles(startUploadResponse, uploads, "anything")
      ).to.be.rejectedWith(Error);
    });
  });

  describe("retryUpload", () => {
    const sandbox = createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("throws UnrecoverableJobError if the upload job doesn't have serviceFields.file", () => {
      sandbox.replace(jobStatusClient, "updateJob", stub());
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });
      expect(
        fms.retryUpload({
          ...mockRetryableUploadJob,
          serviceFields: {},
        })
      ).to.be.rejectedWith(Error);
    });

    it("Sets upload status to UNRECOVERABLE if the upload job doesn't have serviceFields.files", async () => {
      const failedJob: JSSJob = {
        ...mockJob,
        status: "FAILED",
      };
      const updateJobStub = stub().resolves(failedJob);
      sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });

      await expect(fms.retryUpload(failedJob)).to.be.rejectedWith(
        UnrecoverableJobError
      );

      expect(updateJobStub).to.have.been.calledWith(failedJob.jobId, {
        status: "UNRECOVERABLE",
        serviceFields: {
          error: "Missing serviceFields.files",
          mostRecentFailure: "Missing serviceFields.files",
        },
      });
    });

    it("transforms data stored on uploadJob to call retry upload on uploader", async () => {
      const retryUploadStub = stub().resolves();
      sandbox.replace(uploader, "retryUpload", retryUploadStub);
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });
      await fms.retryUpload(mockRetryableUploadJob);
      expect(retryUploadStub.getCall(0).args[0]).to.deep.equal(uploads);
      expect(retryUploadStub.getCall(0).args[1]).to.deep.equal(
        mockRetryableUploadJob
      );
    });

    it("throws error if uploader.retryUpload throws", () => {
      sandbox.replace(uploader, "retryUpload", stub().rejects());
      sandbox.replace(jobStatusClient, "updateJob", stub());
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });
      expect(fms.retryUpload(mockRetryableUploadJob)).to.be.rejectedWith(Error);
    });

    it("updates upload job with UNRECOVERABLE status if UnrecoverableJobError is thrown", async () => {
      const failedJob: JSSJob = {
        ...mockRetryableUploadJob,
        status: "FAILED",
        childIds: [],
      };
      const updateJobStub = stub().resolves(failedJob);
      sandbox.replace(
        uploader,
        "retryUpload",
        stub().rejects(new UnrecoverableJobError("mock error"))
      );
      sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
      const fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        jobStatusClient,
        uploader,
      });

      await expect(fms.retryUpload(failedJob)).to.be.rejectedWith(
        UnrecoverableJobError
      );
      expect(updateJobStub).to.have.been.calledWith(failedJob.jobId, {
        status: "UNRECOVERABLE",
        serviceFields: { error: "mock error", mostRecentFailure: "mock error" },
      });
    });
  });

  describe("failUpload", () => {
    let jssStub: SinonStubbedInstance<JobStatusClient>;
    let fms: FileManagementSystem;

    beforeEach(() => {
      jssStub = createStubInstance(JobStatusClient);
      fms = new FileManagementSystem({
        getCopyWorker: getCopyWorkerStub,
        fss,
        uploader,
        // Assert that the stub is of the correct type when calling the
        // constructor
        jobStatusClient: (jssStub as unknown) as JobStatusClient,
      });
    });

    it("fails an upload with no children", async () => {
      const parentJobId = "parent-job-id";
      const failedParentJob = { ...mockJob, jobId: parentJobId };
      jssStub.updateJob.onFirstCall().resolves(failedParentJob);

      const failedJobs = await fms.failUpload(parentJobId);

      expect(failedJobs).to.deep.equal([failedParentJob]);
    });

    it("fails an upload and its direct children", async () => {
      const parentJobId = "parent-job-id";
      const child1JobId = "child-1-job-id";
      const child2JobId = "child-2-job-id";
      const failedParentJob: JSSJob = {
        ...mockJob,
        jobId: parentJobId,
        childIds: [child1JobId, child2JobId],
      };
      const failedChild1Job: JSSJob = { ...mockJob, jobId: child1JobId };
      const failedChild2Job: JSSJob = { ...mockJob, jobId: child2JobId };
      jssStub.updateJob
        .onFirstCall()
        .resolves(failedParentJob)
        .onSecondCall()
        .resolves(failedChild1Job)
        .onThirdCall()
        .resolves(failedChild2Job);

      const failedJobs = await fms.failUpload(parentJobId);

      expect(failedJobs).to.deep.equal([
        failedParentJob,
        failedChild1Job,
        failedChild2Job,
      ]);
    });

    it("fails an upload, its direct children, and the children's children", async () => {
      const parentJobId = "parent-job-id";
      const child1JobId = "child-1-job-id";
      const child2JobId = "child-2-job-id";
      const child3JobId = "child-3-job-id";
      const failedParentJob: JSSJob = {
        ...mockJob,
        jobId: parentJobId,
        childIds: [child1JobId, child2JobId],
      };
      const failedChild1Job: JSSJob = {
        ...mockJob,
        jobId: child1JobId,
        childIds: [child3JobId],
      };
      const failedChild2Job: JSSJob = { ...mockJob, jobId: child2JobId };
      const failedChild3Job: JSSJob = { ...mockJob, jobId: child3JobId };
      jssStub.updateJob
        .onFirstCall()
        .resolves(failedParentJob)
        .onSecondCall()
        .resolves(failedChild1Job)
        .onThirdCall()
        .resolves(failedChild2Job)
        .onCall(3)
        .resolves(failedChild3Job);

      const failedJobs = await fms.failUpload(parentJobId, "TEST");

      expect(failedJobs).to.deep.equal([
        failedParentJob,
        failedChild1Job,
        failedChild2Job,
        failedChild3Job,
      ]);
    });
  });
});
