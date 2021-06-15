import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { noop } from "lodash";
import * as hash from "object-hash";
import * as rimraf from "rimraf";
import {
  createStubInstance,
  stub,
  restore,
  replace,
  SinonStubbedInstance,
} from "sinon";

import FileManagementSystem from "../";
import { FileStorageClient, JobStatusClient, LabkeyClient } from "../..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { mockJob } from "../../../state/test/mocks";
import { FileType } from "../../../state/upload/types";
import { JSSJobStatus } from "../../job-status-client/types";
import { WORKER_MESSAGE_TYPE } from "../copy-worker";

describe("FileManagementSystem", () => {
  let fms: FileManagementSystem;
  let fss: SinonStubbedInstance<FileStorageClient>;
  let jss: SinonStubbedInstance<JobStatusClient>;
  let lk: SinonStubbedInstance<LabkeyClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  let copyWorkerGetter: SinonStubbedInstance<() => Worker>;
  const pathToFakeFile = path.resolve(os.tmpdir(), "myFakeFile.txt");
  let copyWorkerStub: { onmessage: any; postMessage: any; onerror: any };

  before(async () => {
    await fs.promises.writeFile(pathToFakeFile, "test file");
  });

  after(async () => {
    await fs.promises.unlink(pathToFakeFile);
  });

  beforeEach(() => {
    fss = createStubInstance(FileStorageClient);
    jss = createStubInstance(JobStatusClient);
    lk = createStubInstance(LabkeyClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub();
    copyWorkerStub = {
      onmessage: stub(),
      onerror: stub(),
      postMessage: stub(),
    };
    copyWorkerGetter = stub().returns(copyWorkerStub);

    fms = new FileManagementSystem({
      fss: (fss as any) as FileStorageClient,
      jss: (jss as any) as JobStatusClient,
      lk: (lk as any) as LabkeyClient,
      storage: (storage as any) as EnvironmentAwareStorage,
      copyWorkerGetter: (copyWorkerGetter as any) as () => Worker,
    });
  });

  afterEach(() => {
    restore();
  });

  describe("startUpload", () => {
    it("throws error if file does not exist", () => {
      // Arrange
      const filePath = "/foo/bar";
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: filePath },
      } as any;

      // Act / Assert
      expect(fms.startUpload(filePath, metadata, {})).to.be.rejectedWith(
        `Can not find file: ${filePath}`
      );
    });

    it("throws error if metadata is missing fileType property", () => {
      // Arrange
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: pathToFakeFile },
      } as any;

      // Act / Assert
      expect(fms.startUpload(pathToFakeFile, metadata, {})).to.be.rejectedWith(
        `Metadata for file ${pathToFakeFile} is missing the property file.fileType`
      );
    });

    it("throws error if metadata originalPath does not match file", () => {
      // Arrange
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: "fail", fileType: FileType.IMAGE },
      } as any;

      // Act / Assert
      expect(fms.startUpload(pathToFakeFile, metadata, {})).to.be.rejectedWith(
        `Metadata for file ${pathToFakeFile} is missing the property file.originalPath`
      );
    });

    it("throws error if it cannot get a start upload response from FSS", () => {
      // Arrange
      const error = new Error("failed to start upload");
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: "fail", fileType: FileType.IMAGE },
      } as any;
      fss.startUpload.rejects(error);

      // Act / Assert
      expect(fms.startUpload(pathToFakeFile, metadata)).to.be.rejectedWith(
        error
      );
    });

    it("throws error if JSS fails to creates job within reasonable time", () => {
      // Arrange
      const fssResponse = {
        jobId: "myJobId",
        uploadDirectory: "/here/is/my/upload",
      };
      const error = new Error("failed to create JSS job");
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: "fail", fileType: FileType.IMAGE },
      } as any;
      fss.startUpload.resolves(fssResponse);
      jss.waitForJobToExist.rejects(error);

      // Act / Assert
      expect(fms.startUpload(pathToFakeFile, metadata, {})).to.be.rejectedWith(
        error
      );
    });

    it("start job via FSS", async () => {
      // Arrange
      const fssResponse = { jobId: "9402", uploadDirectory: "/here" };
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: pathToFakeFile, fileType: FileType.IMAGE },
      } as any;
      const serviceFields = { groupId: "mygroupid" };
      fss.startUpload.resolves(fssResponse);
      jss.waitForJobToExist.resolves();

      // Act
      const result = await fms.startUpload(
        pathToFakeFile,
        metadata,
        serviceFields
      );

      // Assert
      expect(result).to.equal(fssResponse);
      expect(fss.startUpload).to.be.calledOnceWithExactly(
        pathToFakeFile,
        metadata,
        serviceFields
      );
    });
  });

  describe("uploadFile", () => {
    const fakeUploadDirectory = path.resolve(
      os.tmpdir(),
      "fakeUploadDirectoryTest"
    );

    before(async () => {
      await fs.promises.mkdir(fakeUploadDirectory);
    });

    after(() => {
      rimraf.sync(fakeUploadDirectory);
    });

    it("copies file, informs FSS, and updates job appropriately", async () => {
      // Arrange
      const jobId = "abcdefgh123";
      const metadata = {
        customMetadata: {
          templateId: 9,
          annotations: [],
        },
        file: { originalPath: pathToFakeFile, fileType: FileType.TEXT },
      };
      const expectedFSSResponse = { jobId, files: [] };
      fss.uploadComplete.resolves(expectedFSSResponse);

      const postMessageStub = stub().callsFake(() => {
        copyWorkerStub.onmessage({
          data: `${WORKER_MESSAGE_TYPE.SUCCESS}:somemd5`,
        });
      });
      replace(copyWorkerStub, "postMessage", postMessageStub);

      // Act
      const result = await fms.uploadFile(
        jobId,
        pathToFakeFile,
        metadata,
        fakeUploadDirectory
      );

      // Assert
      expect(result).to.deep.equal(expectedFSSResponse);
      expect(fss.uploadComplete).to.have.been.calledOnce;
      expect(jss.updateJob).to.have.been.calledTwice;
    });

    it("fails job if an error occurs while copying", () => {
      // Arrange
      const jobId = "abcdefgh123";
      const metadata = {
        customMetadata: {
          templateId: 9,
          annotations: [],
        },
        file: { originalPath: pathToFakeFile, fileType: FileType.TEXT },
      };
      const error = "failed copy";
      const expectedFSSResponse = { jobId, files: [] };
      fss.uploadComplete.resolves(expectedFSSResponse);

      const postMessageStub = stub().callsFake(() => {
        copyWorkerStub.onerror(new Error(error));
      });
      replace(copyWorkerStub, "postMessage", postMessageStub);

      // Act / Assert
      expect(
        fms.uploadFile(jobId, pathToFakeFile, metadata, fakeUploadDirectory)
      ).to.be.rejectedWith(error);
    });

    it("fails job if an error occurs while preparing for copy", () => {
      // Arrange
      const error = "failure to update job";
      const metadata = {
        customMetadata: {
          templateId: 1,
          annotations: [],
        },
        file: {
          originalPath: pathToFakeFile,
          fileType: FileType.TEXT,
        },
      };
      const jobId = "abcdefg";
      jss.updateJob.onFirstCall().rejects(error);
      jss.updateJob.onSecondCall().resolves({} as any);

      // Act / Assert
      expect(
        fms.uploadFile(jobId, pathToFakeFile, metadata, fakeUploadDirectory)
      ).to.be.rejectedWith(error);
    });
  });

  describe("retryUpload", () => {
    [
      JSSJobStatus.UNRECOVERABLE,
      JSSJobStatus.WORKING,
      JSSJobStatus.RETRYING,
      JSSJobStatus.BLOCKED,
      JSSJobStatus.SUCCEEDED,
    ].forEach((status) => {
      it(`throws error if ${status} job provided`, () => {
        // Arrange
        const job = {
          ...mockJob,
          status,
        };
        jss.getJob.resolves(job);

        // Act / Assert
        return expect(
          fms.retryUpload(mockJob.jobId, () => noop)
        ).to.be.rejectedWith(
          `Can't retry this upload job because the status is ${status}.`
        );
      });
    });

    it("throws error if file has been uploaded to FMS before", () => {
      // Arrange
      const filePath = "/foo/bar";
      const lastModifiedDate = new Date();
      const md5 = "adsfkjakjasdfkjadsfjkadsf";
      jss.getJob.resolves({
        ...mockJob,
        serviceFields: {
          files: [
            {
              jobId: "abc123",
            },
          ],
          lastModified: {
            [hash.MD5(filePath)]: lastModifiedDate,
          },
          md5: {
            [hash.MD5(filePath)]: md5,
          },
        },
        status: JSSJobStatus.FAILED,
      });
      lk.getFileExistsByMD5AndName.resolves(true);

      // Act / Assert
      expect(fms.retryUpload(mockJob.jobId, () => noop)).to.be.rejectedWith(
        `${path.basename(filePath)} has already been uploaded to FMS.`
      );
    });

    it("retries upload from scratch", async () => {
      // Arrange
      const groupId = "910akdsf";
      const metadata = {
        customMetadata: {
          templateId: 3,
          annotations: [],
        },
        fileType: FileType.IMAGE,
        file: {
          originalPath: pathToFakeFile,
          fileType: FileType.IMAGE,
        },
      };
      jss.getJob.resolves({
        ...mockJob,
        serviceFields: {
          groupId,
          files: [metadata],
        },
      });
      const serviceFields = {
        groupId,
        originalJobId: mockJob.jobId,
      };
      const newJobId = "newJobId";
      const uploadFileResponse = { jobId: newJobId, files: [] };
      fss.startUpload.resolves({
        jobId: newJobId,
        uploadDirectory: "/foo",
      });
      jss.waitForJobToExist.resolves();
      stub(FileManagementSystem.prototype, "uploadFile").resolves(
        uploadFileResponse
      );

      // Act
      const result = await fms.retryUpload(mockJob.jobId, () => noop);

      // Assert
      expect(result).to.be.deep.equal([uploadFileResponse]);
      expect(fss.startUpload).to.have.been.calledOnceWithExactly(
        pathToFakeFile,
        metadata,
        serviceFields
      );
    });
  });

  describe("cancelUpload", () => {
    it("fails job regardless of copy progress", () => {
      // Arrange
      const jobId = "123abc";
      const jobUpdate = {
        status: JSSJobStatus.FAILED,
        serviceFields: {
          cancelled: true,
          error: "Cancelled by user",
        },
      };

      // Act
      fms.cancelUpload(jobId);

      // Assert
      expect(jss.updateJob).to.have.been.calledWith(jobId, jobUpdate);
    });
  });
});
