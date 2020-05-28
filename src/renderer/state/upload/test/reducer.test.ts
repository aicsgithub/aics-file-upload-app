import { expect } from "chai";

import { WORKFLOW_ANNOTATION_NAME } from "../../../constants";
import { closeUploadTab } from "../../route/actions";
import { getMockStateWithHistory, mockState } from "../../test/mocks";
import {
  replaceUpload,
  undoFileWorkflowAssociation,
  updateUpload,
} from "../actions";
import reducer from "../reducer";
import { UploadStateBranch } from "../types";

describe("upload reducer", () => {
  let uploads: UploadStateBranch;

  beforeEach(() => {
    uploads = {
      foo: {
        barcode: "1234",
        file: "/path",
        wellIds: [1, 2],
      },
      bar: {
        barcode: "1235",
        file: "/path2",
        wellIds: [1, 2],
        workflows: ["workflow 1", "workflow 2"],
      },
    };
  });
  describe("undoFileWorkflowAssociation", () => {
    it("undoes a workflow association", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        undoFileWorkflowAssociation("bar", ["workflow 1"])
      );
      const { present } = result;
      expect(present.bar[WORKFLOW_ANNOTATION_NAME]).to.deep.equal([
        "workflow 2",
      ]);
    });
    it("undoes all workflows and removes upload", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        undoFileWorkflowAssociation("bar", ["workflow 1", "workflow 2"])
      );
      const { present } = result;
      expect(present.bar).to.be.undefined;
    });
  });
  describe("updateUpload", () => {
    it("does not change anything if key doesn't exist on upload", () => {
      const result = reducer(
        getMockStateWithHistory({}),
        updateUpload("foo", { wellIds: [1, 2] })
      );
      const { present } = result;
      expect(present).to.be.empty;
    });
    it("updates upload at key specified", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUpload("foo", { wellIds: [3] })
      );
      const { present } = result;
      expect(present.foo.wellIds).to.deep.equal([3]);
    });
  });
  describe("replaceUpload", () => {
    it("replaces entire upload with upload in draft", () => {
      const uploadPartial = {
        barcode: "5678",
        file: "/path2",
        wellIds: [9],
      };
      const draft = {
        metadata: {
          created: new Date(),
          modified: new Date(),
          name: "test",
        },
        state: {
          ...mockState,
          upload: getMockStateWithHistory({
            bar: uploadPartial,
          }),
        },
      };
      const result = reducer(
        getMockStateWithHistory(uploads),
        replaceUpload(draft)
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
});
