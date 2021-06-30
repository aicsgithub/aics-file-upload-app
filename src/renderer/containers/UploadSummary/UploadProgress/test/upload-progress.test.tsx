import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import UploadProgress from "..";
import { JSSJobStatus } from "../../../../services/job-status-client/types";
import { mockWorkingUploadJob } from "../../../../state/test/mocks";
import { UploadSummaryTableRow } from "../../../../state/types";

describe("<UploadProgress/>", () => {
  describe("render", () => {
    let row: UploadSummaryTableRow;
    beforeEach(() => {
      row = {
        ...mockWorkingUploadJob,
        fileId: "mykey",
        filePath: "/my/file/path",
      };
    });
    it("returns null if status is SUCCEEDED", () => {
      const wrapper = shallow(
        <UploadProgress
          row={{
            ...row,
            status: JSSJobStatus.SUCCEEDED,
          }}
        />
      );
      expect(wrapper.isEmptyRender()).to.be.true;
    });
    it("returns null if status is UNRECOVERABLE", () => {
      const wrapper = shallow(
        <UploadProgress
          row={{
            ...row,
            status: JSSJobStatus.UNRECOVERABLE,
          }}
        />
      );
      expect(wrapper.isEmptyRender()).to.be.true;
    });
    it("returns null if status is FAILED and no replacementJobId", () => {
      const wrapper = shallow(
        <UploadProgress
          row={{
            ...row,
            status: JSSJobStatus.FAILED,
          }}
        />
      );
      expect(wrapper.isEmptyRender()).to.be.true;
    });

    it("Returns null if row is missing progress info", () => {
      const wrapper = shallow(<UploadProgress row={row} />);
      expect(wrapper.isEmptyRender()).to.be.true;
    });

    const testStatsDisplay = (
      completedBytes: number,
      fssBytesProcessed: number | undefined,
      totalBytes: number,
      expectedDisplay: string
    ) => {
      const wrapper = shallow(
        <UploadProgress
          row={{
            ...row,
            progress: {
              completedBytes,
              totalBytes,
            },
            serviceFields: {
              fssBytesProcessed,
              files: [],
              lastModified: {},
              md5: {},
              type: "upload",
              uploadDirectory: "/tmp/fss/asdf",
            },
          }}
        />
      );
      expect(wrapper.exists(".progress")).to.be.true;
      expect(wrapper.find(".bytes").text()).to.equal(expectedDisplay);
    };
    it("Displays progress if progress info with correct units", () => {
      // Test app copy step
      testStatsDisplay(0, undefined, 100, "0B / 100B");
      testStatsDisplay(2134, undefined, 4000, "2.1KB / 4KB");
      testStatsDisplay(1000, undefined, 1000000, "1KB / 1MB");
      testStatsDisplay(16122233344, undefined, 34022233344, "16.1GB / 34GB");
      testStatsDisplay(0, undefined, 4000000000000, "0B / 4TB");
      // Test FSS process step
      testStatsDisplay(100, undefined, 100, "0B / 100B");
      testStatsDisplay(100, 50, 100, "50B / 100B");
      testStatsDisplay(4000, 2134, 4000, "2.1KB / 4KB");
      testStatsDisplay(1000000, 1000, 1000000, "1KB / 1MB");
      testStatsDisplay(34022233344, 16122233344, 34022233344, "16.1GB / 34GB");
      testStatsDisplay(4000000000000, 0, 4000000000000, "0B / 4TB");
    });
  });
});
