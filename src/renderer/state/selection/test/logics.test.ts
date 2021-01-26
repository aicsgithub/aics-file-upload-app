import { resolve } from "path";

import { expect } from "chai";
import { createSandbox, SinonStubbedInstance, createStubInstance } from "sinon";

import selections from "../";
import { feedback } from "../../";
import MMSClient from "../../../services/mms-client";
import {
  GetPlateResponse,
  PlateResponse,
} from "../../../services/mms-client/types";
import { requestFailed } from "../../actions";
import route from "../../route";
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
import { AsyncRequest, DragAndDropFileList, Page } from "../../types";
import { getUpload } from "../../upload/selectors";
import { selectBarcode, selectWells } from "../actions";
import {
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
    let fileList: DragAndDropFileList;

    beforeEach(() => {
      // a FileList (https://developer.mozilla.org/en-US/docs/Web/API/FileList) does not have a constructor
      // and must implement some iterator methods. For the purposes of keeping these tests simple, we're casting
      // it twice to make the transpiler happy.
      fileList = {
        length: 2,
        0: {
          name: FILE_NAME,
          path: FILE_FULL_PATH,
        },
        1: {
          name: FOLDER_NAME,
          path: FOLDER_FULL_PATH,
        },
      };
    });

    it("Goes to SelectUploadType page if on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.DragAndDrop,
          view: Page.DragAndDrop,
        },
      });

      // before
      expect(route.selectors.getPage(store.getState())).to.equal(
        Page.DragAndDrop
      );

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(route.selectors.getPage(store.getState())).to.equal(
        Page.SelectUploadType
      );
    });

    it("Does not change page if not on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.SelectUploadType,
          view: Page.SelectUploadType,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);
    });

    it("sets files up for upload", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getUpload(store.getState())).to.be.empty;

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

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
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });

    it("should stop loading on error", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      fileList = {
        length: 2,
        0: {
          name: "does_not_exist.txt",
          path: FILE_FULL_PATH,
        },
        1: {
          name: FOLDER_NAME,
          path: FOLDER_FULL_PATH,
        },
      };
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });
  });

  describe("openFilesLogic", () => {
    let filePaths: string[];

    beforeEach(() => {
      filePaths = [FILE_FULL_PATH, FOLDER_FULL_PATH];
    });

    it("Goes to SelectUploadType page if on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.DragAndDrop,
          view: Page.DragAndDrop,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.DragAndDrop);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);
    });

    it("Does not change page if not on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.SelectUploadType,
          view: Page.SelectUploadType,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);
    });

    it("Stages all files opened", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(Object.keys(getUpload(store.getState()))).to.be.empty;

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      const upload = getUpload(store.getState());

      expect(Object.keys(upload)).to.be.lengthOf(1);
      const file = upload[Object.keys(upload)[0]];
      expect(file.file).to.equal(FILE_FULL_PATH);
    });

    it("Removes child files or directories", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(Object.keys(getUpload(store.getState()))).to.be.empty;

      // apply
      const filePathsWithDuplicates = [
        resolve(FOLDER_FULL_PATH, "test.txt"),
        FOLDER_FULL_PATH,
        resolve(FOLDER_FULL_PATH, "test2.txt"),
      ];
      store.dispatch(
        selections.actions.openFilesFromDialog(filePathsWithDuplicates)
      );

      // after
      await logicMiddleware.whenComplete();
      const upload = getUpload(store.getState());
      expect(Object.keys(upload)).to.be.lengthOf(1);
    });

    it("should stop loading on success", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });

    it("should stop loading on error", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      filePaths = [resolve(__dirname, TEST_FILES_DIR, "does_not_exist.txt")];
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

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

    it("Sets wells, page, barcode, imagingSessionIds and plateId if GET wells is OK", async () => {
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
      expect(getPage(state)).to.equal(Page.AddCustomData);
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
      expect(getPage(state)).to.equal(Page.AddCustomData);
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
});
