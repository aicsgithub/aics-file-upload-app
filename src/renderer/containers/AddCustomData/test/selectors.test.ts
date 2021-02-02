import { expect } from "chai";

import { WELL_ANNOTATION_NAME } from "../../../constants";
import {
  getMockStateWithHistory,
  mockFailedUploadJob,
  mockSelection,
  mockState,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../../state/test/mocks";
import { AsyncRequest } from "../../../state/types";
import { getUploadRowKey } from "../../../state/upload/constants";
import { getCanSubmitUpload, getUploadInProgress } from "../selectors";

describe("AddCustomData selectors", () => {
  describe("getCanSubmitUpload", () => {
    it("returns true if selected job and job failed", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockSelection,
          job: mockFailedUploadJob,
        }),
      });
      expect(result).to.be.true;
    });
    it("returns true if working on new upload, no validation errors, and no requests in progress", () => {
      const result = getCanSubmitUpload(nonEmptyStateForInitiatingUpload);
      expect(result).to.be.true;
    });
    it("returns true if editing an upload and has made changes, no validation errors, and no requests in progress", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          originalUpload: {},
        },
      });
      expect(result).to.be.true;
    });
    it("returns false if there are validation errors", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file3" })]: {
            file: "/path/to/file3",
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      expect(result).to.be.false;
    });
    it("returns false if there are requests in progress related to uploading that job", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [
            `${AsyncRequest.INITIATE_UPLOAD}-file1, file2, file3`,
          ],
        },
      });
      expect(result).to.be.false;
    });
    it("returns false if there are requests in progress related to updating file metadata for that job", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [
            `${AsyncRequest.UPDATE_FILE_METADATA}-file1, file2, file3`,
          ],
        },
      });
      expect(result).to.be.false;
    });
    it("returns true if requestsInProgress does not contain requests related to uploading the current job or updating file metadata", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [`${AsyncRequest.INITIATE_UPLOAD}-other`],
        },
      });
      expect(result).to.be.true;
    });
    it("returns false if editing an upload but have not made changes", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          originalUpload: mockWellUpload,
        },
      });
      expect(result).to.be.false;
    });
  });
  describe("uploadInProgress", () => {
    it("returns false if no current job name", () => {
      const result = getUploadInProgress(mockState);
      expect(result).to.be.false;
    });
    it("returns true if requestsInProgress contains UPDATE_FILE_METADATA-jobName", () => {
      const result = getUploadInProgress({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [
            `${AsyncRequest.UPDATE_FILE_METADATA}-file1, file2, file3`,
          ],
        },
      });
      expect(result).to.be.true;
    });
    it("returns false if requestsInProgress doesn't contain UPDATE_FILE_METADATA-jobName", () => {
      const result = getUploadInProgress({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [`${AsyncRequest.UPDATE_FILE_METADATA}-other`],
        },
      });
      expect(result).to.be.false;
    });

    it("returns false if requestsInProgress does not contain INITIATE_UPLOAD-currentUploadName", () => {
      const inProgress = getUploadInProgress(mockState);
      expect(inProgress).to.be.false;
    });
    it("returns true if requestsInProgress contains INITIATE_UPLOAD-currentUploadName", () => {
      const currentJobName = `foo`;
      const inProgress = getUploadInProgress({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          requestsInProgress: [
            `${AsyncRequest.INITIATE_UPLOAD}-${currentJobName}`,
          ],
        },
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/path/foo.json",
        },
        upload: getMockStateWithHistory(mockWellUpload),
      });
      expect(inProgress).to.be.true;
    });
    it("returns false if requestsInProgress contains request belonging to a different upload", () => {
      const inProgress = getUploadInProgress({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          requestsInProgress: [`${AsyncRequest.INITIATE_UPLOAD}-bar`],
        },
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/path/foo.json",
        },
        upload: getMockStateWithHistory({
          foo: {
            barcode: "1234",
            file: "foo",
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      expect(inProgress).to.be.false;
    });
  });
});
