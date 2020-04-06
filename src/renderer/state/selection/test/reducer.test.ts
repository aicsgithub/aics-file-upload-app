import { expect } from "chai";
import { closeUploadTab } from "../../route/actions";
import {
    getMockStateWithHistory,
    mockPlate,
    mockSelection,
    mockWells,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import { replaceUpload } from "../../upload/actions";

import reducer from "../reducer";
import { initialState } from "../reducer";
import {
    getExpandedUploadJobRows,
    getFolderTreeOpen,
    getSelectedAnnotation,
    getSelectedBarcode,
    getSelectedFiles,
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
                folderTreeOpen: false,
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
            const draft = {
               metadata: {
                   created: new Date(),
                   modified: new Date(),
                   name: "test",
               },
               state: nonEmptySelectionsState,
            };
            const result = reducer(getMockStateWithHistory(mockSelection), replaceUpload(draft));
            const { present } = result;
            expect(present.barcode).to.equal(getSelectedBarcode(nonEmptySelectionsState));
            expect(present.expandedUploadJobRows).to.equal(getExpandedUploadJobRows(nonEmptySelectionsState));
            expect(present.folderTreeOpen).to.equal(getFolderTreeOpen(nonEmptySelectionsState));
            expect(present.imagingSessionId).to.equal(getSelectedImagingSessionId(nonEmptySelectionsState));
            expect(present.imagingSessionIds).to.equal(getSelectedImagingSessionIds(nonEmptySelectionsState));
            expect(present.plate).to.equal(getSelectedPlates(nonEmptySelectionsState));
            expect(present.wells).to.equal(getWells(nonEmptySelectionsState));

            expect(present.annotation).to.equal(mockSelection.annotation);
            expect(present.files).to.equal(mockSelection.files);
            expect(present.user).to.equal(mockSelection.user);
        });
    });
    describe("closeUploadTab", () => {
        it("resets upload tab selections", () => {
            const result = reducer(nonEmptySelectionsState.selection, closeUploadTab());
            const { present } = result;
            expect(present.barcode).to.equal(initialState.barcode);
            expect(present.expandedUploadJobRows).to.deep.equal(initialState.expandedUploadJobRows);
            expect(present.imagingSessionId).to.equal(initialState.imagingSessionId);
            expect(present.imagingSessionIds).to.deep.equal(initialState.imagingSessionIds);
            expect(present.plate).to.deep.equal(initialState.plate);
            expect(present.wells).to.deep.equal(initialState.wells);
            expect(present.selectedWells).to.deep.equal(initialState.selectedWells);
            expect(present.selectedWorkflows).to.deep.equal(initialState.selectedWorkflows);
            expect(present.stagedFiles).to.deep.equal(initialState.stagedFiles);

            expect(present.annotation).to.equal(getSelectedAnnotation(nonEmptySelectionsState));
            expect(present.files).to.equal(getSelectedFiles(nonEmptySelectionsState));
            expect(present.user).to.equal(getSelectedUser(nonEmptySelectionsState));
        });
    });
});