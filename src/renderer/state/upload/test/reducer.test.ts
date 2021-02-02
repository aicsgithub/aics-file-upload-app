import { expect } from "chai";

import {
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../../constants";
import { closeUploadTab } from "../../route/actions";
import { getMockStateWithHistory, mockState } from "../../test/mocks";
import { UploadStateBranch } from "../../types";
import { replaceUpload, updateUpload, updateUploads } from "../actions";
import reducer from "../reducer";

describe("upload reducer", () => {
  let uploads: UploadStateBranch;

  beforeEach(() => {
    uploads = {
      foo: {
        barcode: "1234",
        file: "/path",
        [WELL_ANNOTATION_NAME]: [1, 2],
      },
      bar: {
        barcode: "1235",
        file: "/path2",
        [WELL_ANNOTATION_NAME]: [1, 2],
        [WORKFLOW_ANNOTATION_NAME]: ["workflow 1", "workflow 2"],
      },
    };
  });
  describe("updateUpload", () => {
    it("does not change anything if key doesn't exist on upload", () => {
      const result = reducer(
        getMockStateWithHistory({}),
        updateUpload("foo", { [WELL_ANNOTATION_NAME]: [1, 2] })
      );
      const { present } = result;
      expect(present).to.be.empty;
    });
    it("updates upload at key specified", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUpload("foo", { [WELL_ANNOTATION_NAME]: [3] })
      );
      const { present } = result;
      expect(present.foo[WELL_ANNOTATION_NAME]).to.deep.equal([3]);
    });
  });
  describe("replaceUpload", () => {
    it("replaces entire upload with upload in draft", () => {
      const uploadPartial = {
        barcode: "5678",
        file: "/path2",
        [WELL_ANNOTATION_NAME]: [9],
      };
      const draft = {
        ...mockState,
        upload: getMockStateWithHistory({
          bar: uploadPartial,
        }),
      };
      const result = reducer(
        getMockStateWithHistory(uploads),
        replaceUpload("/path/file.json", draft)
      );
      const { present } = result;
      expect(present.foo).to.be.undefined;
      expect(present.bar).to.equal(uploadPartial);
    });
  });
  describe("closeUploadTab", () => {
    it("clears all uploads", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        closeUploadTab()
      );
      const { present } = result;
      expect(present).to.be.empty;
    });
  });
  describe("updateUploads", () => {
    it("replaces entire upload if payload.clearAll is true", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUploads({ someKey: { file: "/path/test.txt" } }, true)
      );
      expect(result.present.foo).to.be.undefined;
    });
    it("does not override parts of upload not covered in payload.replacement if payload.clearAll is false", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUploads({ someKey: { file: "/path/test.txt" } }, false)
      );
      expect(result.present.foo).to.not.be.undefined;
    });
  });
});
