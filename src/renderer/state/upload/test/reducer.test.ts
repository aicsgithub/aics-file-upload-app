import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { resetUpload } from "../../route/actions";
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
        [AnnotationName.WELL]: [1, 2],
      },
      bar: {
        barcode: "1235",
        file: "/path2",
        [AnnotationName.WELL]: [1, 2],
      },
    };
  });
  describe("updateUpload", () => {
    it("does not change anything if key doesn't exist on upload", () => {
      const result = reducer(
        getMockStateWithHistory({}),
        updateUpload("foo", { [AnnotationName.WELL]: [1, 2] })
      );
      const { present } = result;
      expect(present).to.be.empty;
    });

    it("updates upload at key specified", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUpload("foo", { [AnnotationName.WELL]: [3] })
      );
      const { present } = result;
      expect(present.foo[AnnotationName.WELL]).to.deep.equal([3]);
    });

    it("resets imaging session and well when plate barcode changes", () => {
      // Arrange
      const state = getMockStateWithHistory({
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
        },
      });
      const expected = {
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.PLATE_BARCODE]: ["149231"],
          [AnnotationName.IMAGING_SESSION]: [],
          [AnnotationName.WELL]: [],
        },
      };

      // Act
      const result = reducer(
        state,
        updateUpload("foo", { [AnnotationName.PLATE_BARCODE]: ["149231"] })
      );

      // Assert
      expect(result.present).to.deep.equal(expected);
    });

    it("resets well when imaging session changes", () => {
      // Arrange
      const state = getMockStateWithHistory({
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.IMAGING_SESSION]: [],
        },
      });
      const expected = {
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
          [AnnotationName.WELL]: [],
        },
      };

      // Act
      const result = reducer(
        state,
        updateUpload("foo", { [AnnotationName.IMAGING_SESSION]: ["4 hours"] })
      );

      // Assert
      expect(result.present).to.deep.equal(expected);
    });
  });
  describe("replaceUpload", () => {
    it("replaces entire upload with upload in draft", () => {
      const uploadPartial = {
        barcode: "5678",
        file: "/path2",
        [AnnotationName.WELL]: [9],
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
  describe("resetUpload", () => {
    it("clears all uploads", () => {
      const result = reducer(getMockStateWithHistory(uploads), resetUpload());
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
