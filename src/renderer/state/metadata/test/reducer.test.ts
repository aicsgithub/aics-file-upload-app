import { expect } from "chai";

import {
  closeUpload,
  openEditFileMetadataTab,
  openEditFileMetadataTabSucceeded,
} from "../../route/actions";
import {
  mockState,
  mockSuccessfulUploadJob,
  mockWellUpload,
} from "../../test/mocks";
import { Page } from "../../types";
import { replaceUpload, saveUploadDraftSuccess } from "../../upload/actions";
import {
  clearFileMetadataForJob,
  clearOptionsForLookup,
  receiveMetadata,
  resetHistory,
  updatePageHistory,
} from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("metadata reducer", () => {
  const filePath = "/foo/bar/test.json";
  describe("clearOptionsForLookup", () => {
    it("sets options to an empty array", () => {
      const result = reducer(
        { ...initialState, "Cell Lines": [{}, {}] },
        clearOptionsForLookup("Cell Lines")
      );
      expect(result["Cell Lines"]).to.be.empty;
    });
  });
  describe("receiveMetadata", () => {
    it("adds metadata from payload", () => {
      const result = reducer(initialState, receiveMetadata({ color: "red" }));
      expect(result.color).to.equal("red");
    });
  });
  describe("resetHistory", () => {
    it("resets selection, template, and upload history", () => {
      const result = reducer(initialState, resetHistory());
      expect(result.history).to.deep.equal({
        selection: {},
        template: {},
        upload: {},
      });
    });
  });
  describe("updatePageHistory", () => {
    it("updates page history", () => {
      const result = reducer(
        initialState,
        updatePageHistory(Page.AddCustomData, 1, 2, 3)
      );
      expect(result.history.selection[Page.AddCustomData]).to.equal(1);
      expect(result.history.upload[Page.AddCustomData]).to.equal(2);
      expect(result.history.template[Page.AddCustomData]).to.equal(3);
    });
  });
  describe("clearFileMetadataForJob", () => {
    it("clears fileMetadataForJob", () => {
      const result = reducer(
        { ...initialState, fileMetadataForJob: [{}] },
        clearFileMetadataForJob()
      );
      expect(result.fileMetadataForJob).to.be.undefined;
    });
  });
  describe("replaceUpload", () => {
    it("sets currentUploadFilePath", () => {
      const result = reducer(initialState, replaceUpload(filePath, mockState));
      expect(result.currentUploadFilePath).to.not.be.undefined;
    });
  });
  describe("closeUpload", () => {
    it("clears currentUploadFilePath", () => {
      const result = reducer(
        {
          ...initialState,
          currentUploadFilePath: filePath,
        },
        closeUpload()
      );
      expect(result.currentUpload).to.be.undefined;
    });
    it("clears originalUpload", () => {
      const result = reducer(
        {
          ...initialState,
          originalUpload: {},
        },
        closeUpload()
      );
      expect(result.originalUpload).to.be.undefined;
    });
  });
  describe("openEditFileMetadataTab", () => {
    it("clears currentUploadFilePath", () => {
      const result = reducer(
        {
          ...initialState,
          currentUploadFilePath: "/foo.json",
        },
        openEditFileMetadataTab(mockSuccessfulUploadJob)
      );
      expect(result.currentUploadFilePath).to.be.undefined;
    });
  });
  describe("openEditFileMetadataTabSucceeded", () => {
    it("sets originalUpload", () => {
      const result = reducer(
        initialState,
        openEditFileMetadataTabSucceeded(mockWellUpload)
      );
      expect(result.originalUpload).to.equal(mockWellUpload);
    });
  });
  describe("saveUploadDraftSuccess", () => {
    it("sets currentUploadFilePath", () => {
      const result = reducer(initialState, saveUploadDraftSuccess("/path"));
      expect(result.currentUploadFilePath).to.not.be.undefined;
    });
  });
});
