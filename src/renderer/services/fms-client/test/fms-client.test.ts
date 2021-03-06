import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { noop } from "lodash";
import * as hash from "object-hash";
import * as rimraf from "rimraf";
import { createStubInstance, stub, restore, SinonStubbedInstance } from "sinon";

import FileManagementSystem from "../";
import { FileStorageClient, JobStatusClient, LabkeyClient } from "../..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { mockJob } from "../../../state/test/mocks";
import { FileType } from "../../../state/upload/types";
import { JSSJobStatus } from "../../job-status-client/types";
import FileCopier from "../FileCopier";

describe("FileManagementSystem", () => {
  let fms: FileManagementSystem;
  let fss: SinonStubbedInstance<FileStorageClient>;
  let jss: SinonStubbedInstance<JobStatusClient>;
  let lk: SinonStubbedInstance<LabkeyClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  let fileCopier: SinonStubbedInstance<FileCopier>;
  const pathToFakeFile = path.resolve(os.tmpdir(), "myFakeFile.txt");

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
    fileCopier = createStubInstance(FileCopier);

    fms = new FileManagementSystem({
      fss: (fss as any) as FileStorageClient,
      jss: (jss as any) as JobStatusClient,
      lk: (lk as any) as LabkeyClient,
      storage: (storage as any) as EnvironmentAwareStorage,
      fileCopier: (fileCopier as any) as FileCopier,
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
      return expect(fms.startUpload(filePath, metadata, {})).to.be.rejectedWith(
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
      return expect(
        fms.startUpload(pathToFakeFile, metadata, {})
      ).to.be.rejectedWith(
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
      return expect(
        fms.startUpload(pathToFakeFile, metadata, {})
      ).to.be.rejectedWith(
        `Metadata for file ${pathToFakeFile} has property file.originalPath set to fail which doesn't match ${pathToFakeFile}`
      );
    });

    it("throws error if it cannot get a start upload response from FSS", () => {
      // Arrange
      const error = new Error("failed to start upload");
      const metadata = {
        customMetadata: { templateId: 1, annotations: [] },
        file: { originalPath: pathToFakeFile, fileType: FileType.IMAGE },
      } as any;
      fss.startUpload.rejects(error);

      // Act / Assert
      return expect(
        fms.startUpload(pathToFakeFile, metadata)
      ).to.be.rejectedWith(error);
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
        file: { originalPath: pathToFakeFile, fileType: FileType.IMAGE },
      } as any;
      fss.startUpload.resolves(fssResponse);
      jss.waitForJobToExist.rejects(error);

      // Act / Assert
      return expect(
        fms.startUpload(pathToFakeFile, metadata, {})
      ).to.be.rejectedWith(error);
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
      fileCopier.copyToDestAndCalcMD5.resolves("md5");

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

    it("tests Windows paths", async () => {
      const originalPlatform = process.platform;
      // Manually set the platform for this test
      Object.defineProperty(process, "platform", { value: "win32" });

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
      fileCopier.copyToDestAndCalcMD5.resolves("md5");

      // Act
      const result = await fms.uploadFile(
        jobId,
        pathToFakeFile,
        metadata,
        fakeUploadDirectory
      );

      // Assert
      expect(fileCopier.copyToDestAndCalcMD5).to.have.been.calledOnceWith(
        "abcdefgh123",
        pathToFakeFile,
        // The forward-slashes should be replaced with back-slashes on Windows
        fakeUploadDirectory.replace(/\//g, "\\")
      );
      expect(result).to.deep.equal(expectedFSSResponse);
      expect(fss.uploadComplete).to.have.been.calledOnce;
      expect(jss.updateJob).to.have.been.calledTwice;

      // Restore original platform
      Object.defineProperty(process, "platform", { value: originalPlatform });
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
      const error = new Error("failed copy");
      fileCopier.copyToDestAndCalcMD5.rejects(error);
      const expectedFSSResponse = { jobId, files: [] };
      fss.uploadComplete.resolves(expectedFSSResponse);

      // Act / Assert
      return expect(
        fms.uploadFile(jobId, pathToFakeFile, metadata, fakeUploadDirectory)
      ).to.be.rejectedWith(error);
    });

    it("fails job if an error occurs while preparing for copy", () => {
      // Arrange
      const error = new Error("failure to update job");
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
      return expect(
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

    it("throws error if file has been uploaded to FMS before", async () => {
      // Arrange
      const lastModifiedDate = (
        await fs.promises.stat(pathToFakeFile)
      ).mtime.toISOString();
      const md5 = "adsfkjakjasdfkjadsfjkadsf";
      const jssJob = {
        ...mockJob,
        serviceFields: {
          files: [
            {
              jobId: "abc123",
              file: {
                originalPath: pathToFakeFile,
                fileType: FileType.IMAGE,
              },
            },
          ],
          lastModified: {
            [hash.MD5(pathToFakeFile)]: lastModifiedDate,
          },
          md5: {
            [hash.MD5(pathToFakeFile)]: md5,
          },
        },
        status: JSSJobStatus.FAILED,
      };
      jss.getJob.resolves(jssJob);
      fss.startUpload.resolves({ jobId: "abc123", uploadDirectory: "" });
      lk.getFileExistsByMD5AndName.resolves(true);

      // Act / Assert
      return expect(
        fms.retryUpload(mockJob.jobId, () => noop)
      ).to.be.rejectedWith(
        `${path.basename(pathToFakeFile)} has already been uploaded to FMS.`
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
    it("fails job regardless of copy progress", async () => {
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
      await fms.cancelUpload(jobId);

      // Assert
      expect(jss.updateJob).to.have.been.calledWith(jobId, jobUpdate);
    });
  });
});
