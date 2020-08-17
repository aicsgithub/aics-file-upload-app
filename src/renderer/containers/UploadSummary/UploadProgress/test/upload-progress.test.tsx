import { expect } from "chai";
import { shallow } from "enzyme";
import * as React from "react";

import UploadProgress from "../";
import { mockWorkingUploadJob } from "../../../../state/test/mocks";
import { UploadSummaryTableRow } from "../../../../state/types";

describe("<UploadProgress/>", () => {
  describe("render", () => {
    let row: UploadSummaryTableRow;
    beforeEach(() => {
      row = {
        ...mockWorkingUploadJob,
        key: "mykey",
      };
    });
    it("returns null if status is SUCCEEDED", () => {
      const wrapper = shallow(
        <UploadProgress
          isPolling={true}
          row={{
            ...row,
            status: "SUCCEEDED",
          }}
        />
      );
      expect(wrapper.isEmptyRender()).to.be.true;
    });
    it("returns null if status is UNRECOVERABLE", () => {
      const wrapper = shallow(
        <UploadProgress
          isPolling={true}
          row={{
            ...row,
            status: "UNRECOVERABLE",
          }}
        />
      );
      expect(wrapper.isEmptyRender()).to.be.true;
    });
    it("returns null if status is FAILED and no replacementJobId", () => {
      const wrapper = shallow(
        <UploadProgress
          isPolling={true}
          row={{
            ...row,
            status: "FAILED",
          }}
        />
      );
      expect(wrapper.isEmptyRender()).to.be.true;
    });
    it("Returns <>Replaced</> if job was replaced", () => {
      const wrapper = shallow(
        <UploadProgress
          isPolling={true}
          row={{
            ...row,
            serviceFields: {
              replacementJobId: "abc",
            },
            status: "FAILED",
          }}
        />
      );
      const replacedInfo = wrapper.find(".replaced");
      expect(replacedInfo.exists(".replaced")).to.be.true;
      expect(replacedInfo.text()).to.equal("Replaced with jobId abc");
    });
    it("Returns <div>No Progress info</div> if row is missing progress info", () => {
      const wrapper = shallow(<UploadProgress isPolling={true} row={row} />);
      expect(wrapper.find(".progress").exists()).to.be.false;
      expect(wrapper.find(".progressContainer").text()).to.equal(
        "No progress info"
      );
    });

    const testStatsDisplay = (
      completedBytes: number,
      totalBytes: number,
      expectedDisplay: string
    ) => {
      const wrapper = shallow(
        <UploadProgress
          isPolling={true}
          row={{
            ...row,
            progress: {
              completedBytes,
              totalBytes,
            },
          }}
        />
      );
      expect(wrapper.exists(".progress")).to.be.true;
      expect(wrapper.find(".bytes").text()).to.equal(expectedDisplay);
    };
    it("Displays progress if progress info with correct units", () => {
      testStatsDisplay(0, 100, "0B / 100B");
      testStatsDisplay(2134, 4000, "2.1KB / 4KB");
      testStatsDisplay(1000, 1000000, "1KB / 1MB");
      testStatsDisplay(16122233344, 34022233344, "16.1GB / 34GB");
      testStatsDisplay(0, 4000000000000, "0B / 4TB");
    });
  });
});
