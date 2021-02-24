import { expect } from "chai";

import { resetUpload, openEditFileMetadataTab } from "../../route/actions";
import {
  getMockStateWithHistory,
  mockPlate,
  mockSelection,
  mockSuccessfulUploadJob,
  mockWells,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import { replaceUpload } from "../../upload/actions";
import { setPlate } from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";
import {
  getExpandedUploadJobRows,
  getSelectedBarcode,
  getSelectedImagingSessionId,
  getSelectedImagingSessionIds,
  getSelectedPlates,
  getSelectedUser,
  getWells,
} from "../selectors";

describe("selection reducer", () => {
  let nonEmptySelectionsState: State;
  beforeEach(() => {
    nonEmptySelectionsState = {
      ...nonEmptyStateForInitiatingUpload,
      selection: getMockStateWithHistory({
        ...nonEmptyStateForInitiatingUpload.selection.present,
        annotation: "Dataset",
        barcode: "1234",
        expandedUploadJobRows: { "/path/to/file": true },
        files: ["file1", "file2"],
        imagingSessionId: undefined,
        imagingSessionIds: [null, 1],
        plate: mockPlate,
        user: "lisah",
        wells: mockWells,
      }),
    };
  });
  describe("replaceUpload", () => {
    it("replaces upload tab specific selections", () => {
      const result = reducer(
        getMockStateWithHistory(mockSelection),
        replaceUpload("/path/file.json", nonEmptySelectionsState)
      );
      const { present } = result;
      expect(present.barcode).to.equal(
        getSelectedBarcode(nonEmptySelectionsState)
      );
      expect(present.expandedUploadJobRows).to.equal(
        getExpandedUploadJobRows(nonEmptySelectionsState)
      );
      expect(present.imagingSessionId).to.equal(
        getSelectedImagingSessionId(nonEmptySelectionsState)
      );
      expect(present.imagingSessionIds).to.equal(
        getSelectedImagingSessionIds(nonEmptySelectionsState)
      );
      expect(present.plate).to.equal(
        getSelectedPlates(nonEmptySelectionsState)
      );
      expect(present.wells).to.equal(getWells(nonEmptySelectionsState));

      expect(present.user).to.equal(mockSelection.user);
    });
  });
  describe("resetUpload", () => {
    it("resets upload tab selections", () => {
      const result = reducer(nonEmptySelectionsState.selection, resetUpload());
      const { present } = result;
      expect(present.barcode).to.equal(initialState.barcode);
      expect(present.expandedUploadJobRows).to.deep.equal(
        initialState.expandedUploadJobRows
      );
      expect(present.imagingSessionId).to.equal(initialState.imagingSessionId);
      expect(present.imagingSessionIds).to.deep.equal(
        initialState.imagingSessionIds
      );
      expect(present.plate).to.deep.equal(initialState.plate);
      expect(present.wells).to.deep.equal(initialState.wells);
      expect(present.selectedWells).to.deep.equal(initialState.selectedWells);
      expect(present.job).to.be.undefined;

      expect(present.user).to.equal(getSelectedUser(nonEmptySelectionsState));
    });
  });
  describe("setPlate", () => {
    it("sets imagingSessionId to first value in imagingSessionIds, plate to payload.plate and wells to payload.wells", () => {
      const result = reducer(
        getMockStateWithHistory(initialState),
        setPlate(mockPlate, mockWells, [1, 2])
      );
      expect(result.present.imagingSessionId).to.equal(1);
      expect(result.present.plate).to.equal(mockPlate);
      expect(result.present.wells).to.equal(mockWells);
    });
  });
  describe("openEditFileMetadataTab", () => {
    it("sets selected job", () => {
      const result = reducer(
        getMockStateWithHistory(initialState),
        openEditFileMetadataTab(mockSuccessfulUploadJob)
      );
      expect(result.present.job).to.equal(mockSuccessfulUploadJob);
    });
  });
});
