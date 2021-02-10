import { basename } from "path";
import * as path from "path";

import { expect } from "chai";
import { ILogger } from "js-logger/src/types";
import * as hash from "object-hash";
import * as rimraf from "rimraf";
import {
  createSandbox,
  createStubInstance,
  match,
  SinonStub,
  SinonStubbedInstance,
  stub,
} from "sinon";

import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { mockFailedAddMetadataJob } from "../../../state/test/mocks";
import { LocalStorage } from "../../../types";
import JobStatusClient from "../../job-status-client";
import { JSSJobStatus } from "../../job-status-client/types";
import LabkeyClient from "../../labkey-client";
import { UPLOAD_WORKER_SUCCEEDED } from "../constants";
import { FSSClient } from "../helpers/fss-client";
import { StepExecutor } from "../helpers/step-executor";
import {
  ADD_METADATA_TYPE,
  COPY_CHILD_TYPE,
  COPY_TYPE,
  Uploader,
} from "../helpers/uploader";
import { FileSystemUtil } from "../types";

import {
  mockCompleteUploadJob,
  mockCopyJobChild1,
  mockCopyJobChild2,
  mockCopyJobParent,
  mockJob,
  mockRetryableUploadJob,
  responseFile1,
  responseFile2,
  resultFiles,
  startUploadResponse,
  targetDir,
  upload1,
  upload2,
  uploadJobId,
  uploads,
} from "./mocks";

export const differentTargetDir = path.resolve("./aics");
export const differentTargetFile1 = path.resolve(
  differentTargetDir,
  path.basename(upload1)
);
export const differentTargetFile2 = path.resolve(
  differentTargetDir,
  path.basename(upload2)
);
describe("Uploader", () => {
  const sandbox = createSandbox();
  const uploadJobName = "Upload job name";
  let logger: {
    error: SinonStub;
    info: SinonStub;
    warn: SinonStub;
  };
  let copyWorkerStub: {
    postMessage: SinonStub;
    onmessage: SinonStub;
    onerror: SinonStub;
  };
  let jobStatusClient: SinonStubbedInstance<JobStatusClient>;
  let fss: SinonStubbedInstance<FSSClient>;
  let lk: SinonStubbedInstance<LabkeyClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  let fs: {
    access: SinonStub;
    stat: SinonStub;
  };
  let uploader: Uploader;
  let executeStepsStub: SinonStub;

  beforeEach(() => {
    copyWorkerStub = {
      onmessage: stub(),
      onerror: stub(),
      postMessage: stub(),
    };
    executeStepsStub = stub().resolves({ resultFiles });
    sandbox.replace(StepExecutor, "executeSteps", executeStepsStub);
    jobStatusClient = createStubInstance(JobStatusClient);
    lk = createStubInstance(LabkeyClient);
    fss = createStubInstance(FSSClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = sandbox.stub();
    jobStatusClient.getJobs
      .onFirstCall()
      // upload job children
      .resolves([mockCopyJobParent, mockJob])
      // copy job children
      .onSecondCall()
      .resolves([mockCopyJobChild1, mockCopyJobChild2]);
    fss.uploadComplete.resolves({
      files: resultFiles,
      jobId: uploadJobId,
    });
    logger = {
      error: stub(),
      info: stub(),
      warn: stub(),
    };
    fs = {
      access: stub().resolves(),
      stat: stub().resolves({ size: 100 }),
    };
    uploader = new Uploader(
      stub().returns(copyWorkerStub),
      (fss as any) as FSSClient,
      (jobStatusClient as any) as JobStatusClient,
      (lk as any) as LabkeyClient,
      (storage as any) as LocalStorage,
      (logger as any) as ILogger,
      (fs as any) as FileSystemUtil
    );
  });

  afterEach(() => {
    sandbox.restore();
    rimraf.sync(targetDir);
    rimraf.sync(differentTargetDir);
  });

  // Here we fake a successful copy by calling onmessage right after postMessage is called off of the copy worker stub
  // Without this, onmessage would never get called and the tests would timeout
  const fakeSuccessfulCopy = () => {
    const postMessageStub = stub().callsFake(() => {
      copyWorkerStub.onmessage({
        data: `${UPLOAD_WORKER_SUCCEEDED}:somemd5`,
      });
    });
    sandbox.replace(copyWorkerStub, "postMessage", postMessageStub);
    return postMessageStub;
  };

  describe("uploadFiles", () => {
    it("Creates new upload child jobs and copy jobs, and returns expected result", async () => {
      fakeSuccessfulCopy();
      const result = await uploader.uploadFiles(
        startUploadResponse,
        uploads,
        uploadJobName
      );
      expect(jobStatusClient.createJob).to.have.been.calledWithMatch({
        serviceFields: {
          type: COPY_TYPE,
        },
      });
      expect(jobStatusClient.createJob).to.have.been.calledWithMatch({
        serviceFields: {
          type: ADD_METADATA_TYPE,
        },
      });
      expect(jobStatusClient.createJob).to.have.been.calledWithMatch({
        serviceFields: {
          type: COPY_CHILD_TYPE,
          originalPath: upload1,
        },
      });
      expect(jobStatusClient.createJob).to.have.been.calledWithMatch({
        serviceFields: {
          type: COPY_CHILD_TYPE,
          originalPath: upload2,
        },
      });
      expect(jobStatusClient.getJobs).not.to.have.been.called;
      expect(result).to.deep.equal({
        [path.basename(upload1)]: responseFile1,
        [path.basename(upload2)]: responseFile2,
      });
    });

    it("Doesn't start copying files if creating upload jobs fails", async () => {
      expect(copyWorkerStub.postMessage.called).to.be.false;
      jobStatusClient.createJob.rejects();
      await expect(
        uploader.uploadFiles(startUploadResponse, uploads, "jobName")
      ).to.be.rejectedWith("Failed to create child upload job");
      expect(copyWorkerStub.postMessage.called).to.be.false;
    });

    it("Replaces the default mount point with the new mount point if specified", async () => {
      const postMessageStub = fakeSuccessfulCopy();
      storage.get.returns({
        mountPoint: differentTargetDir,
      });
      await uploader.uploadFiles(startUploadResponse, uploads, "jobName");
      expect(
        postMessageStub.calledWith(
          match.array.contains([differentTargetFile1, differentTargetFile2])
        )
      );
    });
  });

  describe("retryUpload", () => {
    const lastModified1 = new Date();
    const lastModified2 = new Date();
    const md51 = "foo";
    const md52 = "bar";
    beforeEach(() => {
      lk.getFileExistsByMD5AndName.resolves(false);
    });
    it("Throws error if upload job provided is missing serviceFields.uploadDirectory", () => {
      return expect(
        uploader.retryUpload(uploads, {
          ...mockRetryableUploadJob,
          serviceFields: {
            ...mockRetryableUploadJob.serviceFields,
            uploadDirectory: undefined,
          },
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if unrecoverable upload job provided", () => {
      return expect(
        uploader.retryUpload(uploads, {
          ...mockJob,
          status: JSSJobStatus.UNRECOVERABLE,
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if working upload job provided", () => {
      return expect(
        uploader.retryUpload(uploads, {
          ...mockJob,
          status: JSSJobStatus.WORKING,
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if retrying upload job provided", () => {
      return expect(
        uploader.retryUpload(uploads, {
          ...mockJob,
          status: JSSJobStatus.RETRYING,
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if blocked upload job provided", () => {
      return expect(
        uploader.retryUpload(uploads, {
          ...mockJob,
          status: JSSJobStatus.BLOCKED,
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if file has been uploaded to FMS before", () => {
      lk.getFileExistsByMD5AndName
        .withArgs(md51, basename(upload1))
        .resolves(true);
      lk.getFileExistsByMD5AndName
        .withArgs(md52, basename(upload2))
        .resolves(false);
      fs.stat.withArgs(upload1).resolves({ mtime: lastModified1 });
      fs.stat.withArgs(upload2).resolves({ mtime: lastModified2 });
      return expect(
        uploader.retryUpload(uploads, {
          ...mockRetryableUploadJob,
          serviceFields: {
            ...mockRetryableUploadJob.serviceFields,
            lastModified: {
              [hash.MD5(upload1)]: lastModified1,
              [hash.MD5(upload2)]: lastModified2,
            },
            md5: {
              [hash.MD5(upload1)]: md51,
              [hash.MD5(upload2)]: md52,
            },
            uploadDirectory: "/foo",
          },
          status: JSSJobStatus.FAILED,
        })
      ).to.be.rejectedWith(Error);
    });
    it("Does not throw error if file has been modified", () => {
      fs.stat.withArgs(upload1).resolves({ mtime: new Date() });
      fs.stat.withArgs(upload2).resolves({ mtime: new Date() });
      return expect(
        uploader.retryUpload(uploads, {
          ...mockRetryableUploadJob,
          serviceFields: {
            ...mockRetryableUploadJob.serviceFields,
            lastModified: {
              [hash.MD5(upload1)]: lastModified1,
              [hash.MD5(upload2)]: lastModified2,
            },
            md5: {
              [hash.MD5(upload1)]: md51,
              [hash.MD5(upload2)]: md52,
            },
          },
          status: JSSJobStatus.FAILED,
        })
      ).to.not.be.rejectedWith(Error);
    });
    it("Returns previous output stored on upload job if upload job provided succeeded", async () => {
      const result = await uploader.retryUpload(uploads, mockCompleteUploadJob);
      expect(jobStatusClient.createJob.called).to.be.false;
      expect(jobStatusClient.getJobs.called).to.be.false;
      expect(result).to.deep.equal(resultFiles);
    });
    it("Retries upload if waiting upload job provided", async () => {
      fakeSuccessfulCopy();
      await uploader.retryUpload(uploads, {
        ...mockRetryableUploadJob,
        status: JSSJobStatus.WAITING,
      });
      expect(jobStatusClient.updateJob.called).to.be.true;
    });
    it("Retries upload if failed upload job provided and does not create new jobs if uploadDirectory still present", async () => {
      fakeSuccessfulCopy();
      await uploader.retryUpload(uploads, mockRetryableUploadJob);
      expect(jobStatusClient.updateJob).to.have.been.calledWithMatch(
        "uploadJobId",
        {
          status: JSSJobStatus.RETRYING,
          serviceFields: {
            error: null,
          },
        }
      );
      expect(jobStatusClient.createJob.called).to.be.false;
      expect(jobStatusClient.getJobs.called).to.be.true;
    });
    it("Starts upload over if uploadDirectory is not found", async () => {
      fakeSuccessfulCopy();
      fs.access = stub().rejects();
      fss.startUpload.resolves({
        jobId: "newUploadJobId",
        uploadDirectory: "/foo",
      });
      await uploader.retryUpload(uploads, mockRetryableUploadJob);
      // It is important that we do not set the status to retrying on the original job because it
      // should get replaced if we do not have an upload directory
      expect(jobStatusClient.updateJob).to.not.have.been.calledWithMatch(
        "uploadJobId",
        {
          status: JSSJobStatus.RETRYING,
        }
      );
      expect(fss.startUpload).to.have.been.called;
    });
    it("Creates new upload child jobs if uploadJob.childIds is not defined", async () => {
      fakeSuccessfulCopy();
      await uploader.retryUpload(uploads, {
        ...mockRetryableUploadJob,
        childIds: undefined,
      });
      expect(jobStatusClient.createJob.called).to.be.true;
    });
    it("Throws error if uploads is empty", () => {
      return expect(
        uploader.retryUpload({}, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
    it("Removes copy step for any files that are no longer part of the upload", async () => {
      fakeSuccessfulCopy();
      jobStatusClient.getJobs
        .onFirstCall()
        .resolves([
          { ...mockCopyJobParent, status: JSSJobStatus.FAILED },
          mockFailedAddMetadataJob,
        ])
        .onSecondCall()
        .resolves([
          mockCopyJobChild1,
          mockCopyJobChild2,
          {
            ...mockCopyJobChild1,
            serviceFields: {
              ...mockCopyJobChild1.serviceFields,
              originalPath: "/no-longer-exists",
            },
          },
        ]);

      await uploader.retryUpload(uploads, mockRetryableUploadJob);

      expect(executeStepsStub).to.have.been.calledWith(
        jobStatusClient,
        match.array,
        match.has("copyChildJobs", [mockCopyJobChild1, mockCopyJobChild2])
      );
    });
    it("Throws error if number of child jobs retrieved through JSS is not 2", () => {
      jobStatusClient.getJobs
        .onFirstCall()
        // upload job children
        .resolves([mockJob, mockCopyJobParent])
        // copy job children
        .onSecondCall()
        .resolves([mockCopyJobChild1]);
      return expect(
        uploader.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if it cannot find copy parent job", () => {
      jobStatusClient.getJobs
        .onFirstCall()
        // upload job children
        .resolves([
          mockJob,
          {
            ...mockCopyJobParent,
            serviceFields: {
              ...mockCopyJobParent.serviceFields,
              type: undefined,
            },
          },
        ])
        // copy job children
        .onSecondCall()
        .resolves([mockCopyJobChild1, mockCopyJobChild2]);
      return expect(
        uploader.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if the number of copy jobs is not expected", () => {
      jobStatusClient.getJobs
        .onFirstCall()
        // upload job children
        .resolves([
          mockJob,
          {
            ...mockCopyJobParent,
            serviceFields: {
              ...mockCopyJobParent.serviceFields,
              type: undefined,
            },
          },
        ])
        // copy job children
        .onSecondCall()
        .resolves([mockCopyJobChild1]);
      return expect(
        uploader.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith("Could not find the parent copy job.");
    });
    it("Throws error if a copy job is missing originalPath", () => {
      jobStatusClient.getJobs
        .onFirstCall()
        // upload job children
        .resolves([
          mockJob,
          {
            ...mockCopyJobParent,
            serviceFields: {
              ...mockCopyJobParent.serviceFields,
              type: undefined,
            },
          },
        ])
        // copy job children
        .onSecondCall()
        .resolves([
          mockCopyJobChild1,
          {
            ...mockCopyJobChild2,
            serviceFields: {
              ...mockCopyJobChild2.serviceFields,
              originalPath: undefined,
            },
          },
        ]);
      return expect(
        uploader.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
  });
  describe("getLastModified", () => {
    const path1 = "/path1";
    const date1 = new Date();
    const path2 = "/path2";
    const date2 = new Date();
    const path1Hash = hash.MD5(path1);
    const path2Hash = hash.MD5(path2);

    it("creates a mapping between the hash of the file paths and their modified date", async () => {
      fs.stat.withArgs(path1).resolves({ mtime: date1 });
      fs.stat.withArgs(path2).resolves({ mtime: date2 });
      const lastModified = await uploader.getLastModified([path1, path2]);
      expect(lastModified).to.deep.equal({
        [path1Hash]: date1,
        [path2Hash]: date2,
      });
    });
    it("compiles lastModified dates where possible", async () => {
      fs.stat.withArgs(path1).resolves({ mtime: date1 });
      fs.stat.withArgs(path2).rejects(new Error("foo"));
      const lastModified = await uploader.getLastModified([path1, path2]);
      expect(lastModified).to.deep.equal({
        [path1Hash]: date1,
      });
    });
    it("logs any errors it runs into", async () => {
      fs.stat.withArgs(path1).resolves({ mtime: date1 });
      fs.stat.withArgs(path2).rejects(new Error("foo"));
      await uploader.getLastModified([path1, path2]);
      expect(logger.warn).to.have.been.called;
    });
  });
});
