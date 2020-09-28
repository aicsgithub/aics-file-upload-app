import * as path from "path";

import { stub } from "sinon";

import { JSSJob, JSSJobStatus } from "../../job-status-client/types";
import {
  CopyFileServiceFields,
  CopyFilesServiceFields,
  CustomFileMetadata,
  LabKeyFileMetadata,
  SourceFiles,
  StartUploadResponse,
  UploadMetadataResponse,
  Uploads,
} from "../types";

// For use in tests that involve copying files
export const targetDir = path.resolve("./target-dir-for-tests");
export const upload1 = path.resolve(__dirname, "upload-files/mock-file.txt");
export const upload2 = path.resolve(__dirname, "upload-files/mock-file2.txt");
export const targetFile1 = path.resolve(targetDir, path.basename(upload1));
export const targetFile2 = path.resolve(targetDir, path.basename(upload2));
export const metadata1 = {
  customMetadata: {
    annotations: [],
    templateId: 1,
  },
  file: {
    fileType: "other",
    originalPath: upload1,
    shouldBeInArchive: true,
    shouldBeInLocal: false,
  },
};
export const metadata2 = {
  customMetadata: {
    annotations: [],
    templateId: 1,
  },
  file: {
    fileType: "other",
    originalPath: upload2,
    shouldBeInArchive: true,
    shouldBeInLocal: true,
  },
};
export const uploads: Uploads = {
  [upload1]: metadata1,
  [upload2]: metadata2,
};
export const sourceFiles: SourceFiles = {
  [upload1]: {
    fileName: "mock-file.txt",
    md5hex: "somemd5",
    fileType: "other",
    metadata: {
      ...metadata1,
      file: {
        ...metadata1.file,
        fileName: "mock-file.txt",
        fileType: "other",
        originalPath: upload1,
      },
    },
    shouldBeInArchive: true,
    shouldBeInLocal: false,
  },
  [upload2]: {
    fileName: "mock-file2.txt",
    md5hex: "somemd5",
    fileType: "other",
    metadata: {
      ...metadata2,
      file: {
        ...metadata2.file,
        fileName: "mock-file2.txt",
        fileType: "other",
        originalPath: upload2,
      },
    },
    shouldBeInArchive: true,
    shouldBeInLocal: true,
  },
};
export const responseFile1 = {
  fileName: "mock-file.txt",
  fileId: "fakefileid1",
  readPath: targetFile1,
};
export const responseFile2 = {
  fileName: "mock-file2.txt",
  fileId: "fakefileid2",
  readPath: targetFile2,
};
export const resultFiles = [responseFile1, responseFile2];

// Mock jobs galore
export const uploadJobId = "uploadJobId";
const mockCopyJobParentId = "2209bcaea25241cbae58fb1e86e91157";
export const copyChildJobId1 = "copyChildJobId1";
export const copyChildJobId2 = "copyChildJobId2";
export const mockJob: JSSJob = {
  created: new Date(),
  jobId: uploadJobId,
  jobName: "Upload Job created by FSS",
  modified: new Date(),
  originationHost: "dev-aics-fup-001",
  service: "aicsfiles-js",
  serviceFields: null,
  status: JSSJobStatus.WAITING,
  updateParent: false,
  user: "fakeuser",
};
export const mockRetryableUploadJob: JSSJob = {
  ...mockJob,
  childIds: [mockCopyJobParentId, "addMetadataJobId"],
  serviceFields: {
    copyJobId: mockCopyJobParentId,
    files: [metadata1, metadata2],
    uploadDirectory: targetDir,
  },
  status: JSSJobStatus.FAILED,
};
export const mockCompleteUploadJob: JSSJob = {
  ...mockRetryableUploadJob,
  currentStage: "Complete",
  serviceFields: {
    ...mockRetryableUploadJob.serviceFields,
    output: resultFiles,
  },
  status: JSSJobStatus.SUCCEEDED,
};
export const mockCopyJobParent: JSSJob<CopyFilesServiceFields> = {
  ...mockJob,
  childIds: [copyChildJobId1, copyChildJobId2],
  jobId: mockCopyJobParentId,
  jobName: "Copy Job Parent",
  serviceFields: {
    totalBytesToCopy: 1,
    type: "copy",
  },
  updateParent: true,
};
export const mockCopyJobChild1: JSSJob<CopyFileServiceFields> = {
  ...mockJob,
  jobId: copyChildJobId1,
  jobName: "Copy job child1",
  parentId: mockCopyJobParentId,
  serviceFields: {
    originalPath: upload1,
    totalBytes: 1200,
    type: "copy",
  },
  updateParent: true,
};
export const mockCopyJobChild2: JSSJob<CopyFileServiceFields> = {
  ...mockJob,
  jobId: copyChildJobId2,
  jobName: "Copy job child2",
  parentId: mockCopyJobParentId,
  serviceFields: {
    originalPath: upload2,
    totalBytes: 1200,
    type: "copy",
  },
  updateParent: true,
};

// Used in most tests
export const startUploadResponse: StartUploadResponse = {
  jobId: uploadJobId,
  uploadDirectory: targetDir,
};

export const addMetadataResponse: UploadMetadataResponse = {
  jobId: uploadJobId,
  files: resultFiles,
};

export const mockFiles = [{ FileId: "abc123" }];

export const mockLabKeyFileMetadata: LabKeyFileMetadata = {
  fileId: "abc123",
  filename: "example.txt",
  fileSize: 1,
  fileType: "image",
  modified: "sometime",
  modifiedBy: "somebody",
};
export const mockCustomFileMetadata: CustomFileMetadata = {
  annotations: [{ annotationId: 1, values: ["AICS-0", "AICS-11"] }],
};

export const copyWorkerStub = {
  onmessage: stub(),
  onerror: stub(),
  postMessage: stub(),
};
