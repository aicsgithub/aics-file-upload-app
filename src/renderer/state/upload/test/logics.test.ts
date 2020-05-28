import { StartUploadResponse } from "@aics/aicsfiles/type-declarations/types";
import { expect } from "chai";
import { get, keys } from "lodash";
import * as moment from "moment";
import { createSandbox, SinonFakeTimers, stub, useFakeTimers } from "sinon";

import { INCOMPLETE_JOB_IDS_KEY } from "../../../../shared/constants";
import {
  LONG_DATETIME_FORMAT,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../../constants";
import {
  getAlert,
  getOpenUploadModalVisible,
  getSaveUploadDraftModalVisible,
  getUploadError,
} from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { getCurrentUpload } from "../../metadata/selectors";
import { getPage } from "../../route/selectors";
import { Page } from "../../route/types";
import {
  getSelectedBarcode,
  getSelectedFiles,
} from "../../selection/selectors";
import { setAppliedTemplate } from "../../template/actions";
import {
  createMockReduxStore,
  fms,
  mmsClient,
  mockReduxLogicDeps,
  storage,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockDateAnnotation,
  mockMMSTemplate,
  mockNumberAnnotation,
  mockState,
  mockTemplateStateBranch,
  mockTemplateWithManyValues,
  mockTextAnnotation,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import {
  applyTemplate,
  associateFilesAndWells,
  initiateUpload,
  openUploadDraft,
  saveUploadDraft,
  undoFileWellAssociation,
  updateFilesToArchive,
  updateFilesToStoreOnIsilon,
  updateSubImages,
  updateUpload,
  updateUploadRows,
} from "../actions";
import { getUploadRowKey } from "../constants";
import uploadLogics from "../logics";
import {
  getFileToArchive,
  getFileToStoreOnIsilon,
  getUpload,
  getUploadSummaryRows,
} from "../selectors";
import { UpdateSubImagesPayload, UploadJobTableRow } from "../types";

describe("Upload logics", () => {
  describe("associateFileAndWellLogic", () => {
    it("clears files and associates well with file", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
      const file1 = "/path1";
      const file2 = "/path2";
      const wellId = 1;

      store.dispatch(
        associateFilesAndWells([{ file: file1 }, { file: file2 }])
      );

      const state = store.getState();
      expect(getSelectedFiles(state)).to.be.empty;
      const upload = getUpload(store.getState());
      const selectedBarcode = getSelectedBarcode(state);
      expect(get(upload, [file1, WELL_ANNOTATION_NAME, 0])).to.equal(wellId);
      expect(get(upload, [file1, "barcode"])).to.equal(selectedBarcode);
      expect(get(upload, [file2, WELL_ANNOTATION_NAME, 0])).to.equal(wellId);
      expect(get(upload, [file2, "barcode"])).to.equal(selectedBarcode);
    });

    it("sets error alert when rowIds is empty", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

      // before
      let alert = getAlert(store.getState());
      expect(alert).to.be.undefined;

      // apply
      store.dispatch(associateFilesAndWells([]));

      // after
      alert = getAlert(store.getState());
      expect(alert).to.deep.equal({
        message: "Cannot associate files and wells: No files selected",
        type: AlertType.ERROR,
      });
    });

    it("sets error alert if a row to associate with a well contains a channelId", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

      // before
      let alert = getAlert(store.getState());
      expect(alert).to.be.undefined;

      // apply
      store.dispatch(associateFilesAndWells([{ file: "foo", channelId: 1 }]));

      // after
      alert = getAlert(store.getState());
      expect(alert).to.deep.equal({
        message: "Cannot associate wells with a channel row",
        type: AlertType.ERROR,
      });
    });

    it("sets error alert when no barcode selected", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...nonEmptyStateForInitiatingUpload.selection.present,
          barcode: undefined,
        }),
      });

      // before
      let alert = getAlert(store.getState());
      expect(alert).to.be.undefined;

      // apply
      store.dispatch(associateFilesAndWells([{ file: "foo" }]));

      // after
      alert = getAlert(store.getState());
      expect(alert).to.deep.equal({
        message: "Cannot associate files and wells: No plate selected",
        type: AlertType.ERROR,
      });
    });

    it("sets error when no selected wells", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...nonEmptyStateForInitiatingUpload.selection.present,
          selectedWells: [],
        }),
      });

      // before
      let alert = getAlert(store.getState());
      expect(alert).to.be.undefined;

      // apply
      store.dispatch(associateFilesAndWells([{ file: "foo" }]));

      // after
      alert = getAlert(store.getState());
      expect(alert).to.deep.equal({
        message: "Cannot associate files and wells: No wells selected",
        type: AlertType.ERROR,
      });
    });

    it("associates wells with files + positionIndex", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
      const file1 = "/path1";
      const wellId = 1;

      store.dispatch(
        associateFilesAndWells([{ file: file1, positionIndex: 1 }])
      );

      const state = store.getState();
      expect(getSelectedFiles(state)).to.be.empty;
      const upload = getUpload(store.getState());
      const selectedBarcode = getSelectedBarcode(state);
      const uploadRowKey = getUploadRowKey({ file: file1, positionIndex: 1 });
      expect(get(upload, [uploadRowKey, WELL_ANNOTATION_NAME, 0])).to.equal(
        wellId
      );
      expect(get(upload, [uploadRowKey, "barcode"])).to.equal(selectedBarcode);
    });
  });

  describe("undoFileWellAssociationLogic", () => {
    it("removes well associations and removes file by default from uploads if no well associations left", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

      // before
      let uploadRow = getUpload(store.getState())[
        getUploadRowKey({ file: "/path/to/file1" })
      ];
      expect(uploadRow[WELL_ANNOTATION_NAME]).to.not.be.empty;

      // apply
      store.dispatch(undoFileWellAssociation({ file: "/path/to/file1" }));

      // after
      uploadRow = getUpload(store.getState())[
        getUploadRowKey({ file: "/path/to/file1" })
      ];
      expect(uploadRow).to.be.undefined;
    });

    it("removes well associations but not entire row if action.payload.deleteUpload = false", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

      // before
      let uploadRow = getUpload(store.getState())[
        getUploadRowKey({ file: "/path/to/file1" })
      ];
      expect(uploadRow[WELL_ANNOTATION_NAME]).to.not.be.empty;

      // apply
      store.dispatch(
        undoFileWellAssociation({ file: "/path/to/file1" }, false)
      );

      // after
      uploadRow = getUpload(store.getState())[
        getUploadRowKey({ file: "/path/to/file1" })
      ];
      expect(uploadRow).to.not.be.undefined;
      expect(uploadRow[WELL_ANNOTATION_NAME]).to.be.empty;
    });

    it("removes well associations from row matching file and positionIndex", () => {
      const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

      // before
      let uploadRow = getUpload(store.getState())[
        getUploadRowKey({ file: "/path/to/file3", positionIndex: 1 })
      ];
      expect(uploadRow[WELL_ANNOTATION_NAME]?.length).to.equal(2);

      // apply
      store.dispatch(
        undoFileWellAssociation(
          { file: "/path/to/file3", positionIndex: 1 },
          false
        )
      );

      // after
      uploadRow = getUpload(store.getState())[
        getUploadRowKey({ file: "/path/to/file3", positionIndex: 1 })
      ];
      expect(uploadRow).to.not.be.undefined;
      console.log(uploadRow);
      expect(uploadRow[WELL_ANNOTATION_NAME]?.length).to.equal(1);
    });

    it("sets error alert if no wells selected", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...nonEmptyStateForInitiatingUpload.selection.present,
          selectedWells: [],
        }),
      });

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(undoFileWellAssociation({ file: "/path/to/file1" }));

      // after
      expect(getAlert(store.getState())).to.not.be.undefined;
    });
  });

  describe("applyTemplateLogic", () => {
    const sandbox = createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("calls getTemplate using templateId provided", async () => {
      sandbox.replace(
        mmsClient,
        "getTemplate",
        stub().resolves(mockMMSTemplate)
      );
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file" }),
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      const expectedAction = setAppliedTemplate(mockMMSTemplate, {
        [getUploadRowKey({ file: "/path/to/file1" })]: {
          ["Favorite Color"]: [],
          barcode: "1234",
          file: "/path/to/file1",
          key: getUploadRowKey({ file: "/path/to/file" }),
          shouldBeInArchive: true,
          shouldBeInLocal: true,
          [WELL_ANNOTATION_NAME]: [1],
        },
      });

      // before
      expect(actions.includesMatch(expectedAction)).to.be.false;

      // apply
      store.dispatch(applyTemplate(1));
      await logicMiddleware.whenComplete();

      // after
      expect(actions.includesMatch(expectedAction)).to.be.true;
    });
  });

  describe("initiateUploadLogic", () => {
    const sandbox = createSandbox();
    const startUploadResponse: StartUploadResponse = {
      jobId: "abcd",
      uploadDirectory: "/test",
    };
    let clock: SinonFakeTimers;
    beforeEach(() => {
      clock = useFakeTimers();
    });

    afterEach(() => {
      sandbox.restore();
      clock.restore();
    });

    const setUpSuccessStubs = () => {
      const uploadFilesStub = stub().resolves();
      sandbox.replace(fms, "uploadFiles", uploadFilesStub);
      sandbox.replace(
        fms,
        "validateMetadataAndGetUploadDirectory",
        stub().resolves(startUploadResponse)
      );
      return uploadFilesStub;
    };

    it("sets error alert given validation error", async () => {
      sandbox.replace(
        fms,
        "validateMetadataAndGetUploadDirectory",
        stub().rejects()
      );
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );

      expect(getAlert(store.getState())).to.be.undefined;

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(getAlert(store.getState())).to.not.be.undefined;
    });

    it("calls uploadFiles given OK response from validateMetadataAndGetUploadDirectory", () => {
      const uploadFilesStub = setUpSuccessStubs();
      const { store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );
      // before
      expect(uploadFilesStub.called).to.be.false;

      // apply

      // after
      // the setTimeout in the logics forces us to use store.subscribe
      store.subscribe(() => {
        if (uploadFilesStub.called) {
          clock.tick(2000);
          expect(uploadFilesStub.calledWith(startUploadResponse)).to.be.true;
        }
      });
    });
    it("adds to list of incomplete job ids", () => {
      const uploadFilesStub = setUpSuccessStubs();
      const { actions, store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          job: {
            ...nonEmptyStateForInitiatingUpload.job,
            incompleteJobIds: ["existingIncompleteJob"],
          },
        },
        undefined,
        uploadLogics,
        false
      );
      expect(
        actions.list.find((a) => {
          return (
            a.writeToStore && a.updates && a.updates[INCOMPLETE_JOB_IDS_KEY]
          );
        })
      ).to.be.undefined;

      store.dispatch(initiateUpload());

      // after
      // the setTimeout in the logics forces us to use store.subscribe
      store.subscribe(() => {
        if (uploadFilesStub.called) {
          clock.tick(2000);
          expect(
            actions.list.find((a) => {
              return (
                a.writeToStore && a.updates && a.updates[INCOMPLETE_JOB_IDS_KEY]
              );
            })
          ).to.not.be.undefined;
        }
      });
    });

    it("clears Upload Error", () => {
      const uploadFilesStub = setUpSuccessStubs();
      const { store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          feedback: {
            ...nonEmptyStateForInitiatingUpload.feedback,
            uploadError: "foo",
          },
        },
        mockReduxLogicDeps,
        uploadLogics
      );

      // before
      let state = store.getState();
      expect(getUploadError(state)).to.not.be.undefined;

      // apply
      store.dispatch(initiateUpload());

      // after
      // the setTimeout in the logics forces us to use store.subscribe
      store.subscribe(() => {
        if (uploadFilesStub.called) {
          clock.tick(2000);
          state = store.getState();
          expect(getUploadError(state)).to.be.undefined;
        }
      });
    });
    it("sets upload error if upload fails", async () => {
      sandbox.replace(
        fms,
        "validateMetadataAndGetUploadDirectory",
        stub().rejects(new Error("Oops"))
      );
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      // before
      let state = store.getState();
      expect(getUploadError(state)).to.be.undefined;

      // apply
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      // after
      state = store.getState();
      expect(getUploadError(state)).to.not.be.undefined;
    });
    it("closes upload tab", () => {
      const uploadFilesStub = setUpSuccessStubs();
      const { store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          route: {
            ...nonEmptyStateForInitiatingUpload.route,
            page: Page.AddCustomData,
            view: Page.AddCustomData,
          },
        },
        mockReduxLogicDeps,
        uploadLogics
      );

      expect(getPage(store.getState())).to.equal(Page.AddCustomData);

      store.dispatch(initiateUpload());
      store.subscribe(() => {
        if (uploadFilesStub.called) {
          clock.tick(2000);
          expect(getPage(store.getState())).to.equal(Page.UploadSummary);
        }
      });
    });
  });
  describe("updateSubImagesLogic", () => {
    const file = "/path/to/file1";
    const fileRowKey = getUploadRowKey({ file });
    let fileRow: UploadJobTableRow | undefined;
    const mockChannel = { channelId: 1, description: "", name: "" };
    let oneFileUploadMockState: State;

    beforeEach(() => {
      oneFileUploadMockState = {
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [fileRowKey]: {
            barcode: "1234",
            file: "/path/to/file1",
            key: fileRowKey,
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      };
      fileRow = getUploadSummaryRows(oneFileUploadMockState).find(
        (r) => r.key === fileRowKey
      );
      expect(fileRow).to.not.be.undefined;
    });

    it("allows positionIndex = 0 to be added", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      // apply
      if (fileRow) {
        store.dispatch(updateSubImages(fileRow, { positionIndexes: [0] }));
      }

      // after
      state = store.getState();
      const upload = getUpload(state);
      expect(keys(upload).length).to.equal(2);
      const filePositionMetadata =
        upload[getUploadRowKey({ file, positionIndex: 0 })];
      expect(filePositionMetadata).to.not.be.undefined;
      expect(filePositionMetadata).to.deep.equal({
        "Favorite Color": [],
        barcode: "1234",
        channel: undefined,
        file: "/path/to/file1",
        key: getUploadRowKey({ file, positionIndex: 0 }),
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 0,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("allows scene=0 to be added", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      // apply
      if (fileRow) {
        store.dispatch(updateSubImages(fileRow, { scenes: [0] }));
      }

      // after
      state = store.getState();
      const upload = getUpload(state);
      expect(keys(upload).length).to.equal(2);
      const filePositionMetadata = upload[getUploadRowKey({ file, scene: 0 })];
      expect(filePositionMetadata).to.not.be.undefined;
      expect(filePositionMetadata).to.deep.equal({
        "Favorite Color": [],
        barcode: "1234",
        channel: undefined,
        file: "/path/to/file1",
        key: getUploadRowKey({ file, scene: 0 }),
        [NOTES_ANNOTATION_NAME]: [],
        scene: 0,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("does not remove well associations from the file row if adding a channel", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.not.be
        .empty;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { channels: [mockChannel] }));
      }

      // after
      state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.not.be
        .empty;
    });

    it("removes well associations from the file row if adding a position index", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.not.be
        .empty;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { positionIndexes: [1] }));
      }

      // after
      state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.be.empty;
    });

    it("removes well associations from file row if adding a scene", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.not.be
        .empty;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { scenes: [1] }));
      }

      // after
      state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.be.empty;
    });

    it("removes well associations from file row if adding a sub image name", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.not.be
        .empty;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { subImageNames: ["foo"] }));
      }

      // after
      state = store.getState();
      expect(getUpload(state)[fileRowKey][WELL_ANNOTATION_NAME]).to.be.empty;
    });

    it("adds 1 sub row to file if only channel provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);
      const channelOnlyRowKey = getUploadRowKey({
        file,
        channelId: mockChannel.channelId,
      });

      // before
      let state = store.getState();
      let uploadRowKeys = keys(getUpload(state));
      expect(uploadRowKeys.length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { channels: [mockChannel] }));
      }

      // after
      state = store.getState();
      uploadRowKeys = keys(getUpload(state));
      expect(uploadRowKeys.length).to.equal(2);
      expect(getUpload(state)[fileRowKey]).to.not.be.undefined;
      // look for row we expect to get added
      const channelUpload = getUpload(state)[channelOnlyRowKey];
      expect(channelUpload).to.not.be.undefined;
      expect(channelUpload).to.deep.equal({
        barcode: "1234",
        channel: mockChannel,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, channelId: 1 }),
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: undefined,
        scene: undefined,
        subImageName: undefined,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("adds 1 sub row to file if only position provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { positionIndexes: [1] }));
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(2);
      const positionUpload = getUpload(state)[
        getUploadRowKey({ file, positionIndex: 1 })
      ];
      expect(positionUpload).to.not.be.undefined;
      expect(positionUpload).to.deep.equal({
        barcode: "1234",
        channel: undefined,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, positionIndex: 1 }),
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 1,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("adds 1 sub row to file if only scene provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { scenes: [1] }));
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(2);
      const sceneUpload = getUpload(state)[getUploadRowKey({ file, scene: 1 })];
      expect(sceneUpload).to.not.be.undefined;
      expect(sceneUpload).to.deep.equal({
        barcode: "1234",
        channel: undefined,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, scene: 1 }),
        [NOTES_ANNOTATION_NAME]: [],
        scene: 1,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("adds 1 sub row to file if only sub image name provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { subImageNames: ["foo"] }));
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(2);
      const subImageUpload = getUpload(state)[
        getUploadRowKey({ file, subImageName: "foo" })
      ];
      expect(subImageUpload).to.not.be.undefined;
      expect(subImageUpload).to.deep.equal({
        barcode: "1234",
        channel: undefined,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, subImageName: "foo" }),
        [NOTES_ANNOTATION_NAME]: [],
        subImageName: "foo",
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("adds all channels provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);
      expect(getUpload(state)[getUploadRowKey({ file, channelId: 1 })]).to.be
        .undefined;
      expect(getUpload(state)[getUploadRowKey({ file, channelId: 2 })]).to.be
        .undefined;

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, {
            channels: [mockChannel, { ...mockChannel, channelId: 2 }],
          })
        );
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(3);
      expect(getUpload(state)[getUploadRowKey({ file, channelId: 1 })]).to.not
        .be.undefined;
      expect(getUpload(state)[getUploadRowKey({ file, channelId: 2 })]).to.not
        .be.undefined;
    });

    it("adds all positions provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);
      expect(getUpload(state)[getUploadRowKey({ file, positionIndex: 1 })]).to
        .be.undefined;
      expect(getUpload(state)[getUploadRowKey({ file, positionIndex: 2 })]).to
        .be.undefined;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { positionIndexes: [1, 2] }));
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(3);
      expect(getUpload(state)[getUploadRowKey({ file, positionIndex: 1 })]).to
        .not.be.undefined;
      expect(getUpload(state)[getUploadRowKey({ file, positionIndex: 2 })]).to
        .not.be.undefined;
    });

    it("adds all scenes provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);
      expect(getUpload(state)[getUploadRowKey({ file, scene: 1 })]).to.be
        .undefined;
      expect(getUpload(state)[getUploadRowKey({ file, scene: 2 })]).to.be
        .undefined;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { scenes: [1, 2] }));
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(3);
      expect(getUpload(state)[getUploadRowKey({ file, scene: 1 })]).to.not.be
        .undefined;
      expect(getUpload(state)[getUploadRowKey({ file, scene: 2 })]).to.not.be
        .undefined;
    });

    it("adds all sub image names provided", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);
      expect(getUpload(state)[getUploadRowKey({ file, subImageName: "foo" })])
        .to.be.undefined;
      expect(getUpload(state)[getUploadRowKey({ file, subImageName: "bar" })])
        .to.be.undefined;

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, { subImageNames: ["foo", "bar"] })
        );
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(3);
      expect(getUpload(state)[getUploadRowKey({ file, subImageName: "foo" })])
        .to.not.be.undefined;
      expect(getUpload(state)[getUploadRowKey({ file, subImageName: "bar" })])
        .to.not.be.undefined;
    });

    const testBadRequest = (update: Partial<UpdateSubImagesPayload>) => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, update));
      }

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    };

    it("sets alert if there are positions and scenes", () => {
      testBadRequest({
        positionIndexes: [1],
        scenes: [1],
      });
    });

    it("sets alert if there are positions and subimagenames", () => {
      testBadRequest({
        positionIndexes: [1],
        subImageNames: ["foo"],
      });
    });

    it("sets alert if there are scenes and subimagenames", () => {
      testBadRequest({
        scenes: [1],
        subImageNames: ["foo"],
      });
    });

    it("handles position+channel uploads", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, {
            positionIndexes: [1],
            channels: [mockChannel],
          })
        );
      }

      // after
      state = store.getState();
      const uploads = getUpload(state);
      expect(keys(uploads).length).to.equal(4);
      const positionUpload =
        uploads[getUploadRowKey({ file, positionIndex: 1 })];
      expect(positionUpload).to.deep.equal({
        barcode: "1234",
        channel: undefined,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, positionIndex: 1 }),
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 1,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });

      const positionAndChannelKey = getUploadRowKey({
        file,
        positionIndex: 1,
        channelId: 1,
      });
      const positionAndChannelUpload = uploads[positionAndChannelKey];
      expect(positionAndChannelUpload).to.not.be.undefined;
      expect(positionAndChannelUpload).to.deep.equal({
        barcode: "1234",
        channel: mockChannel,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: positionAndChannelKey,
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 1,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("handles scene+channel uploads", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, { scenes: [1], channels: [mockChannel] })
        );
      }

      // after
      state = store.getState();
      const uploads = getUpload(state);
      expect(keys(uploads).length).to.equal(4);
      const sceneUpload = uploads[getUploadRowKey({ file, scene: 1 })];
      expect(sceneUpload).to.deep.equal({
        barcode: "1234",
        channel: undefined,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, scene: 1 }),
        [NOTES_ANNOTATION_NAME]: [],
        scene: 1,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });

      const sceneAndChannelKey = getUploadRowKey({
        file,
        scene: 1,
        channelId: 1,
      });
      const sceneAndChannelUpload = uploads[sceneAndChannelKey];
      expect(sceneAndChannelUpload).to.not.be.undefined;
      expect(sceneAndChannelUpload).to.deep.equal({
        barcode: "1234",
        channel: mockChannel,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: sceneAndChannelKey,
        [NOTES_ANNOTATION_NAME]: [],
        scene: 1,
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("handles subImageName+channel uploads", () => {
      const { store } = createMockReduxStore(oneFileUploadMockState);

      // before
      let state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, {
            subImageNames: ["foo"],
            channels: [mockChannel],
          })
        );
      }

      // after
      state = store.getState();
      const uploads = getUpload(state);
      expect(keys(uploads).length).to.equal(4);
      const positionUpload =
        uploads[getUploadRowKey({ file, subImageName: "foo" })];
      expect(positionUpload).to.deep.equal({
        barcode: "1234",
        channel: undefined,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, subImageName: "foo" }),
        [NOTES_ANNOTATION_NAME]: [],
        subImageName: "foo",
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });

      const positionAndChannelKey = getUploadRowKey({
        file,
        subImageName: "foo",
        channelId: 1,
      });
      const positionAndChannelUpload = uploads[positionAndChannelKey];
      expect(positionAndChannelUpload).to.not.be.undefined;
      expect(positionAndChannelUpload).to.deep.equal({
        barcode: "1234",
        channel: mockChannel,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: positionAndChannelKey,
        [NOTES_ANNOTATION_NAME]: [],
        subImageName: "foo",
        [WELL_ANNOTATION_NAME]: [],
        [WORKFLOW_ANNOTATION_NAME]: [],
      });
    });

    it("removes uploads that don't exist anymore", () => {
      const position1Key = getUploadRowKey({ file, positionIndex: 1 });
      const position1Channel1Key = getUploadRowKey({
        file,
        positionIndex: 1,
        channelId: 1,
      });
      const position2Key = getUploadRowKey({ file, positionIndex: 2 });
      const position2Channel1Key = getUploadRowKey({
        file,
        positionIndex: 2,
        channelId: 1,
      });
      const { store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          upload: getMockStateWithHistory({
            [fileRowKey]: {
              barcode: "1234",
              channelIds: [1],
              file: "/path/to/file1",
              positionIndexes: [1, 2],
              [WELL_ANNOTATION_NAME]: [],
            },
            [position1Key]: {
              barcode: "1234",
              file: "/path/to/file1",
              positionIndex: 1,
              [WELL_ANNOTATION_NAME]: [1],
            },
            [position1Channel1Key]: {
              barcode: "1234",
              channel: mockChannel,
              file: "/path/to/file1",
              positionIndex: 1,
              [WELL_ANNOTATION_NAME]: [],
            },
            [position2Key]: {
              barcode: "1234",
              file: "/path/to/file1",
              positionIndex: 2,
              [WELL_ANNOTATION_NAME]: [2],
            },
            [position2Channel1Key]: {
              barcode: "1234",
              channel: mockChannel,
              file: "/path/to/file1",
              positionIndex: 2,
              [WELL_ANNOTATION_NAME]: [],
            },
          }),
        },
        mockReduxLogicDeps
      );

      // before
      const state = store.getState();
      expect(getUpload(state)[position1Key]).to.not.be.undefined;

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, { scenes: [1, 2], channels: [mockChannel] })
        );
        const uploads = getUpload(store.getState());
        expect(uploads[position1Key]).to.be.undefined;
        expect(uploads[position1Channel1Key]).to.be.undefined;
        expect(uploads[position2Key]).to.be.undefined;
        expect(uploads[position2Channel1Key]).to.be.undefined;
        expect(uploads[getUploadRowKey({ file, scene: 1 })]).to.not.be
          .undefined;
        expect(uploads[getUploadRowKey({ file, scene: 1, channelId: 1 })]).to
          .not.be.undefined;
        expect(uploads[getUploadRowKey({ file, scene: 2 })]).to.not.be
          .undefined;
        expect(uploads[getUploadRowKey({ file, scene: 2, channelId: 1 })]).to
          .not.be.undefined;
      }
    });

    it("removes scenes if subimagenames used instead", () => {
      const scene1RowKey = getUploadRowKey({ file, scene: 1 });
      const scene1Channel1RowKey = getUploadRowKey({
        file,
        scene: 1,
        channelId: 1,
      });
      const channel1RowKey = getUploadRowKey({ file, channelId: 1 });

      const { store } = createMockReduxStore(oneFileUploadMockState);

      let upload;
      if (fileRow) {
        // before
        store.dispatch(
          updateSubImages(fileRow, { scenes: [1], channels: [mockChannel] })
        );
        upload = getUpload(store.getState());
        expect(upload[scene1RowKey]).to.not.be.undefined;
        expect(upload[scene1Channel1RowKey]).to.not.be.undefined;
        expect(upload[channel1RowKey]).to.not.be.undefined;

        // apply
        store.dispatch(
          updateSubImages(fileRow, {
            subImageNames: ["foo"],
            channels: [mockChannel],
          })
        );
      }

      upload = getUpload(store.getState());
      expect(upload[scene1RowKey]).to.be.undefined;
      expect(upload[scene1Channel1RowKey]).to.be.undefined;
      expect(upload[channel1RowKey]).to.not.be.undefined;

      const fooRowKey = getUploadRowKey({ file, subImageName: "foo" });
      const fooChannel1RowKey = getUploadRowKey({
        file,
        subImageName: "foo",
        channelId: 1,
      });
      expect(fooRowKey).to.not.be.undefined;
      expect(fooChannel1RowKey).to.not.be.undefined;
    });
  });

  describe("updateUploadLogic", () => {
    const uploadRowKey = getUploadRowKey({ file: "/path/to/file1" });

    it("converts array of Moment objects to array of dates", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": [],
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = "Birth Date";

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: [moment()] }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation][0] instanceof Date).to.be.true;
    });
    it("converts moment objects to dates", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": [],
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = "Birth Date";
      expect(getUpload(store.getState())[uploadRowKey][annotation]).to.be.empty;

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: moment() }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation][0] instanceof Date).to.be.true;
    });
    it("converts strings to arrays of strings if type is TEXT", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Another Garbage Text Annotation": [],
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = "Another Garbage Text Annotation";
      expect(getUpload(store.getState())[uploadRowKey][annotation]).to.be.empty;

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "a,b,c" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal(["a", "b", "c"]);
    });
    it("converts strings to arrays of numbers if type is NUMBER", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = "Clone Number Garbage";

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "1,2,3" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([1, 2, 3]);
    });
    it("converts ['1, 2e3, 3.86, bad'] to [1, 2000, 3.86] if type is NUMBER", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = "Clone Number Garbage";

      // apply
      store.dispatch(
        updateUpload(uploadRowKey, { [annotation]: "1, 2e3, 3.86, bad" })
      );

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([1, 2000, 3.86]);
    });
    it("converts '' to [] if type is NUMBER", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = "Clone Number Garbage";

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([]);
    });

    it("converts '' to [] if type is TEXT", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            [mockTextAnnotation.name]: [],
            barcode: "",
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
            [WORKFLOW_ANNOTATION_NAME]: ["R&DExp", "Pipeline 4.1"],
          },
        }),
      });

      // before
      const annotation = mockTextAnnotation.name;

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([]);
    });
  });

  describe("updateUploadRowsLogic", () => {
    it("updates a single upload", () => {
      // arrange
      const uploadRowKey = getUploadRowKey({ file: "/path/to/file1" });

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            barcode: "",
            file: "/path/to/file1",
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });

      const barcode = "123456";

      // act
      store.dispatch(updateUploadRows([uploadRowKey], { barcode }));

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey].barcode).to.equal(barcode);
    });

    it("updates multiple uploads", () => {
      // arrange
      const uploadRowKey1 = getUploadRowKey({ file: "/path/to/file1" });
      const uploadRowKey2 = getUploadRowKey({ file: "/path/to/file2" });

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey1]: {
            barcode: "",
            file: "/path/to/file1",
            [WELL_ANNOTATION_NAME]: [],
          },
          [uploadRowKey2]: {
            barcode: "",
            file: "/path/to/file2",
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });

      const barcode = "123456";

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey1, uploadRowKey2], { barcode })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey1].barcode).to.equal(barcode);
      expect(upload[uploadRowKey2].barcode).to.equal(barcode);
    });

    it("converts moment objects to dates", () => {
      // arrange
      const uploadRowKey = getUploadRowKey({ file: "/path/to/file1" });

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [
              {
                ...mockDateAnnotation,
                canHaveManyValues: false,
              },
            ],
          },
        }),
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": undefined,
            barcode: "",
            file: "/path/to/file1",
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey], { "Birth Date": moment() })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey]["Birth Date"][0]).to.be.a("Date");
    });
  });

  describe("updateFilesToStoreOnIsilonLogic", () => {
    it("sets shouldBeInLocal on each file in payload", async () => {
      const { store, logicMiddleware } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
      });

      // before
      expect(getFileToStoreOnIsilon(store.getState())["/path/to/file1"]).to.be
        .true;

      // apply
      store.dispatch(updateFilesToStoreOnIsilon({ "/path/to/file1": false }));

      // after
      await logicMiddleware.whenComplete();
      expect(getFileToStoreOnIsilon(store.getState())["/path/to/file1"]).to.be
        .false;
    });
  });
  describe("updateFilesToStoreInArchiveLogic", () => {
    it("sets shouldBeInArchive on each file in payload", async () => {
      const { store, logicMiddleware } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
      });

      // before
      expect(getFileToArchive(store.getState())["/path/to/file1"]).to.be.true;

      // apply
      store.dispatch(updateFilesToArchive({ "/path/to/file1": false }));

      // after
      await logicMiddleware.whenComplete();
      expect(getFileToArchive(store.getState())["/path/to/file1"]).to.be.false;
    });
  });
  describe("saveUploadDraftLogic", () => {
    it("sets error alert if upload is empty", async () => {
      const { store, logicMiddleware } = createMockReduxStore({
        ...mockState,
        upload: getMockStateWithHistory({}),
      });

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(saveUploadDraft("test"));
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      if (alert) {
        expect(alert.type).to.equal(AlertType.ERROR);
        expect(alert.message).to.equal("Nothing to save");
      }
    });
    it("sets error alert if a draftName cannot be resolved", async () => {
      const { store, logicMiddleware } = createMockReduxStore(mockState);

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(saveUploadDraft(" "));
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      if (alert) {
        expect(alert.type).to.equal(AlertType.ERROR);
        expect(alert.message).to.equal("Draft name cannot be empty");
      }
    });
    it("sets current upload and writes to storage", async () => {
      const { actions, store, logicMiddleware } = createMockReduxStore(
        mockState
      );

      // before
      expect(getCurrentUpload(store.getState())).to.be.undefined;

      // apply
      const now = new Date();
      const state = store.getState();
      store.dispatch(saveUploadDraft("test"));
      await logicMiddleware.whenComplete();

      // after
      const currentUpload = getCurrentUpload(store.getState());
      expect(getCurrentUpload(store.getState())).to.not.be.undefined;
      expect(currentUpload?.name).to.equal("test");
      expect(actions.list.length).to.equal(1);
      expect(actions.list[0].writeToStore).to.be.true;
      expect(actions.list[0].updates).to.deep.equal({
        [`draft.test-${moment(now).format(LONG_DATETIME_FORMAT)}`]: {
          metadata: {
            created: now,
            modified: now,
            name: "test",
          },
          state,
        },
        upload: undefined, // this clears out the current upload draft
      });
    });
    it("uses current upload name if no draft name argument and only updates modified date", async () => {
      const oldDate = new Date(2020, 1, 11);
      const { actions, store, logicMiddleware } = createMockReduxStore({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          currentUpload: {
            created: oldDate,
            modified: oldDate,
            name: "test",
          },
        },
      });

      const now = new Date();
      const state = store.getState();

      // before
      expect(getCurrentUpload(store.getState())?.modified).to.equal(oldDate);
      expect(getCurrentUpload(store.getState())?.created).to.equal(oldDate);

      // apply
      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();

      // after
      expect(getCurrentUpload(store.getState())?.modified).to.deep.equal(now);
      expect(getCurrentUpload(store.getState())?.created).to.deep.equal(
        oldDate
      );

      expect(actions.list.length).to.equal(1);
      expect(actions.list[0].writeToStore).to.be.true;
      expect(actions.list[0].updates).to.deep.equal({
        [`draft.test-${moment(oldDate).format(LONG_DATETIME_FORMAT)}`]: {
          metadata: {
            created: oldDate,
            modified: now,
            name: "test",
          },
          state,
        },
        upload: undefined, // this clears out the current upload draft
      });
    });
  });
  describe("openUploadLogic", () => {
    const sandbox = createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("sets error alert if local storage does not contain draft", async () => {
      const storageGetStub = stub().returns(undefined);
      sandbox.replace(storage, "get", storageGetStub);
      const { store, logicMiddleware } = createMockReduxStore(mockState);

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(openUploadDraft("test"));
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      if (alert) {
        expect(alert.type).to.equal(AlertType.ERROR);
        expect(alert.message).to.equal("Could not find draft named test");
      }
    });
    it("opens saveUploadDraft modal if a user is currently working on an upload", async () => {
      const storageGetStub = stub().returns({
        metadata: {
          created: new Date(),
          modified: new Date(),
          name: "test",
        },
        state: mockState,
      });
      sandbox.replace(storage, "get", storageGetStub);
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          visibleModals: ["openUpload"],
        },
      });

      // before
      expect(getOpenUploadModalVisible(store.getState())).to.be.true;
      expect(getSaveUploadDraftModalVisible(store.getState())).to.be.false;

      // apply
      store.dispatch(openUploadDraft("test"));
      await logicMiddleware.whenComplete();

      // after
      expect(getOpenUploadModalVisible(store.getState())).to.be.false;
      expect(getSaveUploadDraftModalVisible(store.getState())).to.be.true;
    });
    it("closes openUpload modal if nothing to save", async () => {
      const storageGetStub = stub().returns({
        metadata: {
          created: new Date(),
          modified: new Date(),
          name: "test",
        },
        state: mockState,
      });
      sandbox.replace(storage, "get", storageGetStub);
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          visibleModals: ["openUpload"],
        },
        upload: getMockStateWithHistory({}),
      });

      // before
      expect(getOpenUploadModalVisible(store.getState())).to.be.true;

      // apply
      store.dispatch(openUploadDraft("test"));
      await logicMiddleware.whenComplete();

      // after
      expect(getOpenUploadModalVisible(store.getState())).to.be.false;
      expect(getSaveUploadDraftModalVisible(store.getState())).to.be.false;
    });
  });
});
