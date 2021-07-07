import { resolve } from "path";

import { expect } from "chai";
import { createSandbox, SinonStubbedInstance, createStubInstance } from "sinon";

import selections from "../";
import { feedback } from "../../";
import { NOTES_ANNOTATION_NAME } from "../../../constants";
import MMSClient from "../../../services/mms-client";
import {
  GetPlateResponse,
  PlateResponse,
} from "../../../services/mms-client/types";
import { requestFailed } from "../../actions";
import { getPage } from "../../route/selectors";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAuditInfo,
  mockSelection,
  mockState,
  mockWells,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { AsyncRequest, Page } from "../../types";
import { updateUploadRows } from "../../upload/actions";
import { getUpload } from "../../upload/selectors";
import {
  applyMassEdit,
  selectBarcode,
  selectWells,
  startMassEdit,
  stopCellDrag,
} from "../actions";
import {
  getMassEditRow,
  getRowsSelectedForMassEdit,
  getSelectedBarcode,
  getSelectedImagingSessionIds,
  getSelectedPlateId,
  getSelectedPlates,
  getSelectedWells,
  getWells,
} from "../selectors";
import { Well } from "../types";

describe("Selection logics", () => {
  const sandbox = createSandbox();
  const FILE_NAME = "cells.txt";
  const TEST_FILES_DIR = "files";
  const FOLDER_NAME = "a_directory";
  const FILE_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FILE_NAME);
  const FOLDER_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FOLDER_NAME);

  let mmsClient: SinonStubbedInstance<MMSClient>;

  beforeEach(() => {
    mmsClient = createStubInstance(MMSClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("loadFilesLogic", () => {
    let fileList: string[];

    beforeEach(() => {
      fileList = [FILE_FULL_PATH, FOLDER_FULL_PATH];
    });

    it("Does not change page if not on AddCustomData page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.AddCustomData);

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.AddCustomData);
    });

    it("sets files up for upload", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getUpload(store.getState())).to.be.empty;

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      const upload = getUpload(store.getState());

      expect(Object.keys(upload)).to.be.lengthOf(1);
      const file = upload[Object.keys(upload)[0]];
      expect(file.file).to.equal(FILE_FULL_PATH);
    });

    it("should stop loading on success", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });

    it("should stop loading on error", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });
  });

  describe("selectBarcodeLogic", () => {
    const barcode = "1234";
    const plateId = 1;
    let mockOkGetPlateResponse: GetPlateResponse;
    const mockEmptyWell: Well = {
      cellPopulations: [],
      col: 0,
      plateId: 1,
      row: 0,
      solutions: [],
      wellId: 1,
    };
    const mockPlate: PlateResponse = {
      ...mockAuditInfo,
      barcode: "123456",
      comments: "",
      imagingSessionId: undefined,
      plateGeometryId: 1,
      plateId: 1,
      plateStatusId: 1,
      seededOn: "2018-02-14 23:03:52",
    };

    beforeEach(() => {
      mockOkGetPlateResponse = {
        plate: mockPlate,
        wells: [mockEmptyWell],
      };
    });

    it("Sets wells, barcode, imagingSessionIds and plateId if GET wells is OK", async () => {
      mmsClient.getPlate.onFirstCall().callsFake(() => {
        return Promise.resolve(mockOkGetPlateResponse);
      });
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );
      const imagingSessions = [12];

      // apply
      store.dispatch(selectBarcode(barcode, imagingSessions));

      // after
      await logicMiddleware.whenComplete();
      const state = store.getState();
      expect(getSelectedImagingSessionIds(state)).to.equal(imagingSessions);
      expect(getWells(state)).to.not.be.empty;
      expect(getSelectedBarcode(state)).to.equal(barcode);
      expect(getSelectedPlateId(state)).to.equal(plateId);
    });

    it("Builds map of imaging session ids to plate responses on OK response", async () => {
      mmsClient.getPlate.onFirstCall().resolves(mockOkGetPlateResponse);
      const mockPlateResponse2 = {
        plate: {
          ...mockPlate,
          imagingSessionId: 1,
          plateId: 2,
        },
        wells: [
          {
            ...mockEmptyWell,
            plateId: 2,
          },
        ],
      };
      mmsClient.getPlate.onSecondCall().resolves(mockPlateResponse2);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // apply
      store.dispatch(selectBarcode(barcode, [null, 1]));

      // after
      await logicMiddleware.whenComplete();
      const state = store.getState();
      expect(getWells(state)).to.deep.equal({
        0: mockOkGetPlateResponse.wells,
        1: mockPlateResponse2.wells,
      });
      expect(getSelectedPlates(state)).to.deep.equal({
        0: mockOkGetPlateResponse.plate,
        1: mockPlateResponse2.plate,
      });
      expect(getSelectedBarcode(state)).to.equal(barcode);
      expect(getSelectedPlateId(state)).to.equal(plateId);
    });
    it("dispatches requestFailed if request fails", async () => {
      mmsClient.getPlate.rejects(new Error("foo"));
      const { actions, logicMiddleware, store } = createMockReduxStore();

      store.dispatch(selectBarcode(barcode, [null]));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed("Could not get plate info: foo", AsyncRequest.GET_PLATE)
        )
      ).to.be.true;
    });
  });

  describe("selectWellsLogic", () => {
    it("filters out unmodified wells", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: [],
        }),
      });

      // before
      expect(getSelectedWells(store.getState())).to.be.empty;

      // apply
      const cells = mockWells[0].map((w) => ({ col: w.col, row: w.row }));
      store.dispatch(selectWells(cells));

      // after
      expect(getSelectedWells(store.getState()).length).to.equal(4);
    });
  });

  describe("startMassEditLogic", () => {
    it("sets rows selected & added empty row object", () => {
      // Arrange
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
      });
      const selectedRowIds = ["1", "3", "17"];
      // (sanity-check)
      expect(getMassEditRow(store.getState())).to.be.undefined;
      expect(getRowsSelectedForMassEdit(store.getState())).to.be.undefined;

      // Act
      store.dispatch(startMassEdit(selectedRowIds));

      // Assert
      expect(getMassEditRow(store.getState())).to.deep.equal({
        "Favorite Color": [],
      });
      expect(getRowsSelectedForMassEdit(store.getState())).to.deep.equal(
        selectedRowIds
      );
    });
  });

  describe("applyMassEditLogic", () => {
    it("applies non-empty data to rows", async () => {
      // Arrange
      const massEditRow = {
        color: ["blue", "green"],
        [NOTES_ANNOTATION_NAME]: ["hello"],
      };
      const rowsSelectedForMassEdit = ["1", "100", "2"];
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockSelection,
          rowsSelectedForMassEdit,
          massEditRow: {
            ...massEditRow,
            // Add some junk to test exclusion
            CellLine: [],
          },
        }),
      });

      // Act
      store.dispatch(applyMassEdit());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          updateUploadRows(rowsSelectedForMassEdit, massEditRow)
        )
      ).to.be.true;
    });
  });

  describe("stopCellDragLogic", () => {
    it("send update for rows selected", async () => {
      // Arrange
      const uploadValue = "false";
      const rowIdsSelectedForDragEvent = ["21", "3", "9", "18"];
      const rowsSelectedForDragEvent = rowIdsSelectedForDragEvent.map(
        (id, index) => ({
          id,
          index,
        })
      );
      const cellAtDragStart = {
        rowId: "14",
        columnId: "Is Aligned?",
        rowIndex: 2,
      };
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockSelection,
          cellAtDragStart,
          rowsSelectedForDragEvent,
        }),
        upload: getMockStateWithHistory({
          [cellAtDragStart.rowId]: {
            file: "/some/path/to/a/file.txt",
            [cellAtDragStart.columnId]: uploadValue,
          },
        }),
      });

      // Act
      store.dispatch(stopCellDrag());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          updateUploadRows(rowIdsSelectedForDragEvent, {
            [cellAtDragStart.columnId]: uploadValue,
          })
        )
      ).to.be.true;
    });
  });
});
