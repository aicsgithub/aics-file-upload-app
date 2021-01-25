import { expect } from "chai";

import {
  getMockStateWithHistory,
  mockState,
  mockSuccessfulUploadJob,
} from "../../../state/test/mocks";
import { getUploadTabName } from "../selectors";

describe("App selectors", () => {
  describe("getUploadTabName", () => {
    it("returns upload name if an upload draft is open", () => {
      const name = getUploadTabName({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/test/foo.json",
        },
      });
      expect(name).to.equal("foo");
    });
    it("returns job name if job is selected", () => {
      const name = getUploadTabName({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockState.selection.present,
          job: mockSuccessfulUploadJob,
        }),
      });
      expect(name).to.equal(mockSuccessfulUploadJob.jobName);
    });
    it("returns 'Current Upload' if user is working on a new upload", () => {
      const name = getUploadTabName(mockState);
      expect(name).to.equal("Current Upload");
    });
  });
});
