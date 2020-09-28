import * as path from "path";

import { expect } from "chai";
import * as Logger from "js-logger";
import {
  createSandbox,
  createStubInstance,
  match,
  SinonStubbedInstance,
  stub,
} from "sinon";

import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import JobStatusClient from "../../job-status-client";
import { JSSJob, JSSJobStatus } from "../../job-status-client/types";
import LabkeyClient from "../../labkey-client";
import MMSClient from "../../mms-client";
import { UnrecoverableJobError } from "../errors/UnrecoverableJobError";
import {
  FileManagementSystem,
  getDuplicateFilesError,
  getFileDoesNotExistError,
  getFilePropertyMissingError,
  getOriginalPathPropertyDoesntMatch,
  noFilesError,
} from "../file-management-system";
import { FSSClient } from "../helpers/fss-client";
import { Uploader } from "../helpers/uploader";

import {
  addMetadataResponse,
  copyWorkerStub,
  metadata1,
  metadata2,
  mockJob,
  mockRetryableUploadJob,
  startUploadResponse,
  upload1,
  upload2,
  uploads,
} from "./mocks";

export const differentTargetDir = path.resolve("./aics");

describe("FileManagementSystem", () => {
  let uploader: SinonStubbedInstance<Uploader>;
  const sandbox = createSandbox();
  const getCopyWorkerStub = stub().returns(copyWorkerStub);
  let fms: FileManagementSystem;
  let fssClient: SinonStubbedInstance<FSSClient>;
  let jobStatusClient: SinonStubbedInstance<JobStatusClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  let mmsClient: SinonStubbedInstance<MMSClient>;

  beforeEach(() => {
    fssClient = createStubInstance(FSSClient);
    jobStatusClient = createStubInstance(JobStatusClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    labkeyClient = createStubInstance(LabkeyClient);
    mmsClient = createStubInstance(MMSClient);
    const logger = Logger.get("test");
    sandbox.replace(logger, "error", stub());
    uploader = createStubInstance(Uploader);
    fms = new FileManagementSystem({
      fssClient: (fssClient as any) as FSSClient,
      getCopyWorker: getCopyWorkerStub,
      jobStatusClient: (jobStatusClient as any) as JobStatusClient,
      labkeyClient: (labkeyClient as any) as LabkeyClient,
      mmsClient: (mmsClient as any) as MMSClient,
      storage: (storage as any) as LocalStorage,
      uploader: (uploader as any) as Uploader,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("validateMetadataAndGetUploadDirectory", () => {
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
      fssClient.startUpload.rejects(new Error());
      expect(
        fms.validateMetadataAndGetUploadDirectory(goodMetadata, "test_job_name")
      ).to.be.rejectedWith(Error);
    });

    it("Returns response from FSS if OK", async () => {
      fssClient.startUpload.resolves(startUploadResponse);
      expect(
        await fms.validateMetadataAndGetUploadDirectory(
          goodMetadata,
          "test_job_name"
        )
      ).to.equal(startUploadResponse);
    });
  });

  describe("uploadFiles", () => {
    beforeEach(() => {
      fssClient.uploadComplete.resolves(addMetadataResponse);
    });

    it("calls uploader.uploadFiles with uploads and jobName passed in", async () => {
      await fms.uploadFiles(startUploadResponse, uploads, "anything");
      expect(
        uploader.uploadFiles.calledWith(
          startUploadResponse,
          uploads,
          "anything"
        )
      );
    });

    it("throws exception if uploader.uploadFiles throws", () => {
      uploader.uploadFiles.rejects();
      expect(
        fms.uploadFiles(startUploadResponse, uploads, "anything")
      ).to.be.rejectedWith(Error);
    });
  });

  describe("retryUpload", () => {
    it("throws UnrecoverableJobError if the upload job doesn't have serviceFields.file", () => {
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
        status: JSSJobStatus.FAILED,
      };
      jobStatusClient.updateJob.resolves(failedJob);

      await expect(fms.retryUpload(failedJob)).to.be.rejectedWith(
        UnrecoverableJobError
      );

      expect(jobStatusClient.updateJob).to.have.been.calledWith(
        failedJob.jobId,
        {
          status: JSSJobStatus.UNRECOVERABLE,
          serviceFields: {
            error: "Missing serviceFields.files",
          },
        }
      );
    });

    it("transforms data stored on uploadJob to call retry upload on uploader", async () => {
      await fms.retryUpload(mockRetryableUploadJob);
      expect(uploader.retryUpload.getCall(0).args[0]).to.deep.equal(uploads);
      expect(uploader.retryUpload.getCall(0).args[1]).to.deep.equal(
        mockRetryableUploadJob
      );
    });

    it("throws error if uploader.retryUpload throws", () => {
      uploader.retryUpload.rejects();
      expect(fms.retryUpload(mockRetryableUploadJob)).to.be.rejectedWith(Error);
    });

    it("updates upload job with UNRECOVERABLE status if UnrecoverableJobError is thrown", async () => {
      const failedJob: JSSJob = {
        ...mockRetryableUploadJob,
        status: JSSJobStatus.FAILED,
        childIds: [],
      };
      uploader.retryUpload.rejects(new UnrecoverableJobError("mock error"));
      jobStatusClient.updateJob.resolves(failedJob);

      await expect(fms.retryUpload(failedJob)).to.be.rejectedWith(
        UnrecoverableJobError
      );
      expect(jobStatusClient.updateJob).to.have.been.calledWith(
        failedJob.jobId,
        {
          status: JSSJobStatus.UNRECOVERABLE,
          serviceFields: {
            error: "mock error",
          },
        }
      );
    });
  });

  describe("failUpload", () => {
    it("fails an upload with no children", async () => {
      const error = "some error";
      const parentJobId = "parent-job-id";
      const serviceFields = { cancelled: true };
      const failedParentJob = {
        ...mockJob,
        jobId: parentJobId,
        serviceFields: {
          error,
          ...serviceFields,
        },
      };
      jobStatusClient.updateJob.onFirstCall().resolves(failedParentJob);

      const failedJobs = await fms.failUpload(
        parentJobId,
        error,
        JSSJobStatus.FAILED,
        serviceFields
      );

      expect(failedJobs).to.deep.equal([failedParentJob]);
      expect(
        jobStatusClient.updateJob.calledWith(
          parentJobId,
          match({
            status: JSSJobStatus.FAILED,
            serviceFields: {
              ...serviceFields,
              error,
            },
          })
        )
      );
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
      jobStatusClient.updateJob
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
      jobStatusClient.updateJob
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
