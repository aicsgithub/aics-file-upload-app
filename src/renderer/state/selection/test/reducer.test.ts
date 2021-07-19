import { expect } from "chai";

import { resetUpload, viewUploads } from "../../route/actions";
import {
  mockSuccessfulUploadJob,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import reducer from "../reducer";
import { initialState } from "../reducer";
import { getSelectedUser } from "../selectors";

describe("selection reducer", () => {
  let nonEmptySelectionsState: State;
  beforeEach(() => {
    nonEmptySelectionsState = {
      ...nonEmptyStateForInitiatingUpload,
      selection: {
        ...nonEmptyStateForInitiatingUpload.selection,
        user: "lisah",
      },
    };
  });

  describe("resetUpload", () => {
    it("resets upload tab selections", () => {
      const result = reducer(nonEmptySelectionsState.selection, resetUpload());
      expect(result.uploads).to.be.empty;
      expect(result.user).to.equal(getSelectedUser(nonEmptySelectionsState));
    });
  });

  describe("viewUploads", () => {
    it("sets selected uploads", () => {
      const result = reducer(
        initialState,
        viewUploads([mockSuccessfulUploadJob])
      );
      expect(result.uploads).to.deep.equal([mockSuccessfulUploadJob]);
    });
  });
});
