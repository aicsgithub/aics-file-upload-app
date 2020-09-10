import { expect } from "chai";
import { get, keys } from "lodash";
import * as moment from "moment";
import { createSandbox, match, SinonStub, stub } from "sinon";

import { INCOMPLETE_JOB_IDS_KEY } from "../../../../shared/constants";
import {
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../../constants";
import { StartUploadResponse } from "../../../services/aicsfiles/types";
import { ColumnType } from "../../../services/labkey-client/types";
import { CANCEL_BUTTON_INDEX } from "../../../util";
import { requestFailed } from "../../actions";
import { setErrorAlert } from "../../feedback/actions";
import { getAlert } from "../../feedback/selectors";
import { getCurrentJobName } from "../../job/selectors";
import { selectPage } from "../../route/actions";
import {
  getSelectedBarcode,
  getSelectedFiles,
} from "../../selection/selectors";
import { setAppliedTemplate } from "../../template/actions";
import {
  createMockReduxStore,
  dialog,
  fms,
  jssClient,
  mmsClient,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationTypes,
  mockDateAnnotation,
  mockFailedUploadJob,
  mockMMSTemplate,
  mockNumberAnnotation,
  mockState,
  mockSuccessfulUploadJob,
  mockTemplateStateBranch,
  mockTemplateWithManyValues,
  mockTextAnnotation,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
  AlertType,
  AsyncRequest,
  HTTP_STATUS,
  Page,
  State,
  UploadMetadata,
} from "../../types";
import {
  applyTemplate,
  associateFilesAndWells,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUpload,
  initiateUploadFailed,
  openUploadDraft,
  replaceUpload,
  retryUpload,
  saveUploadDraft,
  saveUploadDraftSuccess,
  submitFileMetadataUpdate,
  undoFileWellAssociation,
  updateFilesToArchive,
  updateFilesToStoreOnIsilon,
  updateSubImages,
  updateUpload,
  updateUploadRows,
  uploadSucceeded,
  uploadFailed,
  retryUploadSucceeded,
  retryUploadFailed,
} from "../actions";
import {
  getUploadRowKey,
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_SUCCEEDED,
  SAVE_UPLOAD_DRAFT_SUCCESS,
  UPLOAD_SUCCEEDED,
} from "../constants";
import uploadLogics from "../logics";
import {
  getFileToArchive,
  getFileToStoreOnIsilon,
  getUpload,
  getUploadSummaryRows,
} from "../selectors";
import { UpdateSubImagesPayload, UploadJobTableRow } from "../types";

describe("Upload logics", () => {
  const sandbox = createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
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
      store.dispatch(
        associateFilesAndWells([{ file: "foo", channelId: "Raw 405nm" }])
      );

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
    it("dispatches requestFailed if booleanAnnotationTypeId not defined", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore();
      store.dispatch(applyTemplate(1));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            "Boolean annotation type id not found. Contact Software.",
            AsyncRequest.GET_TEMPLATE
          )
        )
      ).to.be.true;
    });
    it("dispatches requestFailed if getTemplate fails", async () => {
      sandbox.replace(
        mmsClient,
        "getTemplate",
        stub().rejects({
          response: {
            data: {
              error: "foo",
            },
          },
        })
      );
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(applyTemplate(1));
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not apply template: foo",
            AsyncRequest.GET_TEMPLATE
          )
        )
      ).to.be.true;
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
    const jobId = "abcd";
    const startUploadResponse: StartUploadResponse = {
      jobId,
      uploadDirectory: "/test",
    };
    const jobName = "file1, file2, file3";
    let uploadStub: SinonStub;

    beforeEach(() => {
      uploadStub = stub().resolves();
    });

    const setUpSuccessStub = () => {
      sandbox.replace(
        fms,
        "validateMetadataAndGetUploadDirectory",
        stub().resolves(startUploadResponse)
      );
      sandbox.replace(fms, "uploadFiles", uploadStub);
    };

    it("prevents the user from uploading if we cannot name the upload", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(initiateUpload())).to.be.false;
      expect(actions.includesMatch(setErrorAlert("Nothing to upload")));
    });

    it("adds job name to action payload, dispatches initiateUploadSucceeded and selectPageActions, and starts a web worker", async () => {
      setUpSuccessStub();
      const { actions, logicMiddleware, store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          route: {
            page: Page.AddCustomData,
            view: Page.AddCustomData,
          },
          setting: {
            ...nonEmptyStateForInitiatingUpload.setting,
            username: "foo",
          },
        },
        undefined,
        uploadLogics
      );
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch({
          autoSave: true,
          payload: {
            jobName,
          },
          type: INITIATE_UPLOAD,
        })
      ).to.be.true;
      expect(actions.list.find((a) => a.type === INITIATE_UPLOAD_SUCCEEDED)).to
        .not.be.undefined;
      expect(
        actions.includesMatch(
          selectPage(Page.AddCustomData, Page.UploadSummary)
        )
      );
      expect(actions.includesMatch(uploadSucceeded(jobName, jobId, []))).to.be
        .true;
    });

    it("sets error alert given validation error", async () => {
      sandbox.replace(
        fms,
        "validateMetadataAndGetUploadDirectory",
        stub().rejects(new Error("foo"))
      );
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(initiateUploadFailed(jobName, "foo"))).to.be
        .true;
    });

    it("initiates upload given OK response from validateMetadataAndGetUploadDirectory and dispatches upload succeeded", async () => {
      setUpSuccessStub();
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );
      // before
      expect(uploadStub.called).to.be.false;
      expect(actions.list.find((a) => a.type === UPLOAD_SUCCEEDED)).to.be
        .undefined;

      // apply
      store.dispatch(initiateUpload());

      // after
      await logicMiddleware.whenComplete();
      expect(uploadStub.called).to.be.true;
      expect(actions.list.find((a) => a.type === UPLOAD_SUCCEEDED)).to.not.be
        .undefined;
    });
    it("adds to list of incomplete job ids", async () => {
      setUpSuccessStub();
      const { actions, logicMiddleware, store } = createMockReduxStore(
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
      await logicMiddleware.whenComplete();
      expect(
        actions.list.find((a) => {
          return (
            a.writeToStore && a.updates && a.updates[INCOMPLETE_JOB_IDS_KEY]
          );
        })
      ).to.not.be.undefined;
    });
    it("dispatches uploadFailed if uploadFiles fails error", async () => {
      sandbox.replace(
        fms,
        "validateMetadataAndGetUploadDirectory",
        stub().resolves(startUploadResponse)
      );
      sandbox.replace(
        fms,
        "uploadFiles",
        stub().rejects(new Error("error message"))
      );
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          uploadFailed(
            `Upload ${jobName} failed: error message`,
            jobName,
            jobId,
            []
          )
        )
      ).to.be.true;
    });
  });
  describe("retryUploadLogic", () => {
    it("sets error alert if upload job is missing information", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = {
        ...mockFailedUploadJob,
        serviceFields: undefined,
        key: "foo",
      };
      store.dispatch(retryUpload(uploadJob, []));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          setErrorAlert(
            "Not enough information to retry upload. Contact Software."
          )
        )
      ).to.be.true;
    });
    it("calls fms.retryUpload and dispatches retryUploadSucceeded if no missing info on job", async () => {
      const retryUploadStub = stub().resolves();
      sandbox.replace(fms, "retryUpload", retryUploadStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = { ...mockFailedUploadJob, key: "foo" };
      store.dispatch(retryUpload(uploadJob, []));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          retryUploadSucceeded(uploadJob, [mockFailedUploadJob.jobId])
        )
      ).to.be.true;
      expect(retryUploadStub.called).to.be.true;
    });
    it("dispatches retryUploadFailed fms.retryUpload throws exception", async () => {
      const retryUploadStub = stub().rejects(new Error("error"));
      sandbox.replace(fms, "retryUpload", retryUploadStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = { ...mockFailedUploadJob, key: "foo" };
      store.dispatch(retryUpload(uploadJob, []));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          retryUploadFailed(
            uploadJob,
            `Retry upload ${mockFailedUploadJob.jobName} failed: error`,
            [mockFailedUploadJob.jobId]
          )
        )
      ).to.be.true;
      expect(retryUploadStub.called).to.be.true;
    });
  });
  describe("updateSubImagesLogic", () => {
    const file = "/path/to/file1";
    const fileRowKey = getUploadRowKey({ file });
    let fileRow: UploadJobTableRow | undefined;
    const mockChannel = "Raw 405nm";
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
        channelId: undefined,
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
        channelId: undefined,
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
        store.dispatch(updateSubImages(fileRow, { channelIds: [mockChannel] }));
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
        channelId: mockChannel,
      });

      // before
      let state = store.getState();
      let uploadRowKeys = keys(getUpload(state));
      expect(uploadRowKeys.length).to.equal(1);

      if (fileRow) {
        // apply
        store.dispatch(updateSubImages(fileRow, { channelIds: [mockChannel] }));
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
        channelId: mockChannel,
        ["Favorite Color"]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file, channelId: "Raw 405nm" }),
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
        channelId: undefined,
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
        channelId: undefined,
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
        channelId: undefined,
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
      expect(
        getUpload(state)[getUploadRowKey({ file, channelId: "Raw 405nm" })]
      ).to.be.undefined;
      expect(
        getUpload(state)[getUploadRowKey({ file, channelId: "Raw 468nm" })]
      ).to.be.undefined;

      if (fileRow) {
        // apply
        store.dispatch(
          updateSubImages(fileRow, {
            channelIds: [mockChannel, "Raw 468nm"],
          })
        );
      }

      // after
      state = store.getState();
      expect(keys(getUpload(state)).length).to.equal(3);
      expect(
        getUpload(state)[getUploadRowKey({ file, channelId: "Raw 405nm" })]
      ).to.not.be.undefined;
      expect(
        getUpload(state)[getUploadRowKey({ file, channelId: "Raw 468nm" })]
      ).to.not.be.undefined;
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
            channelIds: [mockChannel],
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
        channelId: undefined,
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
        channelId: "Raw 405nm",
      });
      const positionAndChannelUpload = uploads[positionAndChannelKey];
      expect(positionAndChannelUpload).to.not.be.undefined;
      expect(positionAndChannelUpload).to.deep.equal({
        barcode: "1234",
        channelId: mockChannel,
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
          updateSubImages(fileRow, { scenes: [1], channelIds: [mockChannel] })
        );
      }

      // after
      state = store.getState();
      const uploads = getUpload(state);
      expect(keys(uploads).length).to.equal(4);
      const sceneUpload = uploads[getUploadRowKey({ file, scene: 1 })];
      expect(sceneUpload).to.deep.equal({
        barcode: "1234",
        channelId: undefined,
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
        channelId: "Raw 405nm",
      });
      const sceneAndChannelUpload = uploads[sceneAndChannelKey];
      expect(sceneAndChannelUpload).to.not.be.undefined;
      expect(sceneAndChannelUpload).to.deep.equal({
        barcode: "1234",
        channelId: mockChannel,
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
            channelIds: [mockChannel],
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
        channelId: undefined,
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
        channelId: "Raw 405nm",
      });
      const positionAndChannelUpload = uploads[positionAndChannelKey];
      expect(positionAndChannelUpload).to.not.be.undefined;
      expect(positionAndChannelUpload).to.deep.equal({
        barcode: "1234",
        channelId: mockChannel,
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
        channelId: mockChannel,
      });
      const position2Key = getUploadRowKey({ file, positionIndex: 2 });
      const position2Channel1Key = getUploadRowKey({
        file,
        positionIndex: 2,
        channelId: mockChannel,
      });
      const { store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          upload: getMockStateWithHistory({
            [fileRowKey]: {
              barcode: "1234",
              channelIds: [mockChannel],
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
              channelId: mockChannel,
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
              channelId: mockChannel,
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
          updateSubImages(fileRow, {
            scenes: [1, 2],
            channelIds: [mockChannel],
          })
        );
        const uploads = getUpload(store.getState());
        expect(uploads[position1Key]).to.be.undefined;
        expect(uploads[position1Channel1Key]).to.be.undefined;
        expect(uploads[position2Key]).to.be.undefined;
        expect(uploads[position2Channel1Key]).to.be.undefined;
        expect(uploads[getUploadRowKey({ file, scene: 1 })]).to.not.be
          .undefined;
        expect(
          uploads[getUploadRowKey({ file, scene: 1, channelId: "Raw 405nm" })]
        ).to.not.be.undefined;
        expect(uploads[getUploadRowKey({ file, scene: 2 })]).to.not.be
          .undefined;
        expect(
          uploads[getUploadRowKey({ file, scene: 2, channelId: "Raw 405nm" })]
        ).to.not.be.undefined;
      }
    });

    it("removes scenes if subimagenames used instead", () => {
      const scene1RowKey = getUploadRowKey({ file, scene: 1 });
      const scene1Channel1RowKey = getUploadRowKey({
        file,
        scene: 1,
        channelId: "Raw 405nm",
      });
      const channel1RowKey = getUploadRowKey({ file, channelId: "Raw 405nm" });

      const { store } = createMockReduxStore(oneFileUploadMockState);

      let upload;
      if (fileRow) {
        // before
        store.dispatch(
          updateSubImages(fileRow, { scenes: [1], channelIds: [mockChannel] })
        );
        upload = getUpload(store.getState());
        expect(upload[scene1RowKey]).to.not.be.undefined;
        expect(upload[scene1Channel1RowKey]).to.not.be.undefined;
        expect(upload[channel1RowKey]).to.not.be.undefined;

        // apply
        store.dispatch(
          updateSubImages(fileRow, {
            subImageNames: ["foo"],
            channelIds: [mockChannel],
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
        channelId: "Raw 405nm",
      });
      expect(fooRowKey).to.not.be.undefined;
      expect(fooChannel1RowKey).to.not.be.undefined;
    });

    it("sets alert if boolean annotation type cannot be found", () => {
      const state: State = {
        ...oneFileUploadMockState,
        metadata: {
          ...oneFileUploadMockState.metadata,
          annotationTypes: mockAnnotationTypes.filter(
            (type) => type.name !== ColumnType.BOOLEAN
          ),
        },
      };
      const { store } = createMockReduxStore(state);

      if (fileRow) {
        store.dispatch(updateSubImages(fileRow, {}));
      }

      expect(getAlert(store.getState())?.message).to.equal(
        "Could not get boolean annotation type. Contact Software"
      );
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
    it("shows save dialog and does not dispatch saveUploadDraftSuccess if user cancels save", async () => {
      const showSaveDialogStub = stub().resolves({
        cancelled: true,
        filePath: undefined,
      });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const { actions, logicMiddleware, store } = createMockReduxStore();

      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();
      expect(actions.list.find((a) => a.type === SAVE_UPLOAD_DRAFT_SUCCESS)).to
        .be.undefined;
    });
    it("dispatches saveUploadDraftSuccess if user saves draft to file", async () => {
      const showSaveDialogStub = stub().resolves({
        cancelled: false,
        filePath: "/foo",
      });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(saveUploadDraftSuccess())).to.be.true;
    });
    it("dispatches saveUploadDraftSuccess with filePath used to save draft when saveUploadDraft is called with true", async () => {
      const showSaveDialogStub = stub().resolves({
        cancelled: false,
        filePath: "/foo",
      });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(saveUploadDraft(true));
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(saveUploadDraftSuccess("/foo"))).to.be.true;
    });
    it("sets error alert if something goes wrong while saving draft", async () => {
      const showSaveDialogStub = stub().resolves({ filePath: "/foo" });
      const writeFileStub = stub().rejects(new Error("uh oh!"));
      sandbox.replace(mockReduxLogicDeps, "writeFile", writeFileStub);
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(saveUploadDraftSuccess("/foo"))).to.be.false;
      expect(
        actions.includesMatch(setErrorAlert("Could not save draft: uh oh!"))
      ).to.be.true;
    });
  });
  describe("openUploadLogic", () => {
    it("does not show open dialog if user cancels action when asked if they want to save", async () => {
      const showMessageBoxStub = stub().resolves({
        response: CANCEL_BUTTON_INDEX,
      });
      const openDialogStub = stub();
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      sandbox.replace(dialog, "showOpenDialog", openDialogStub);
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      expect(openDialogStub.called).to.be.false;
    });
    it("sets error alert if something goes wrong while trying to save", async () => {
      const writeFileStub = stub().rejects("uh oh!");
      sandbox.replace(mockReduxLogicDeps, "writeFile", writeFileStub);
      const showMessageStub = stub().resolves({ response: 2 });
      const showSaveDialogStub = stub().resolves({
        cancelled: false,
        filePath: "/",
      });
      sandbox.replace(dialog, "showMessageBox", showMessageStub);
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(setErrorAlert("Could not save draft: uh oh!"))
      );
    });
    it("shows open dialog and replaces upload using data from reading file selected by user", async () => {
      const showMessageBoxStub = stub().resolves({ response: 1 });
      const showOpenDialogStub = stub().resolves({
        cancelled: false,
        filePaths: ["/foo"],
      });
      const readFileStub = stub().resolves(mockState);
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      sandbox.replace(dialog, "showOpenDialog", showOpenDialogStub);
      sandbox.replace(mockReduxLogicDeps, "readFile", readFileStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      expect(showOpenDialogStub.called).to.be.true;
      expect(actions.includesMatch(replaceUpload("/foo", mockState)));
    });
  });
  describe("submitFileMetadataUpdateLogic", () => {
    let mockStateForEditingMetadata: State | undefined;
    let catUpload: UploadMetadata | undefined;
    let jobName: string;
    beforeEach(() => {
      catUpload = {
        ...mockWellUpload,
        file: "some file",
        fileId: "cat",
      };
      mockStateForEditingMetadata = {
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockState.selection.present,
          job: mockSuccessfulUploadJob,
        }),
        upload: getMockStateWithHistory({
          cat: catUpload,
        }),
      };
      jobName = getCurrentJobName(mockStateForEditingMetadata) || "";
    });

    const stubMethods = (
      deleteFileMetadataOverride?: SinonStub,
      updateJobOverride?: SinonStub,
      editFileMetadataOverride?: SinonStub
    ): {
      deleteFileMetadataStub: SinonStub;
      updateJobStub: SinonStub;
      editFileMetadataStub: SinonStub;
    } => {
      const deleteFileMetadataStub =
        deleteFileMetadataOverride || stub().resolves();
      const updateJobStub = updateJobOverride || stub().resolves();
      const editFileMetadataStub =
        editFileMetadataOverride || stub().resolves();
      sandbox.replace(mmsClient, "deleteFileMetadata", deleteFileMetadataStub);
      sandbox.replace(jssClient, "updateJob", updateJobStub);
      sandbox.replace(mmsClient, "editFileMetadata", editFileMetadataStub);
      return { deleteFileMetadataStub, updateJobStub, editFileMetadataStub };
    };

    it("sets error alert if no selectedJob", () => {
      const { actions, store } = createMockReduxStore();
      store.dispatch(submitFileMetadataUpdate());
      expect(actions.includesMatch(setErrorAlert("Nothing found to update"))).to
        .be.true;
    });
    it("sets error alert if no applied template", () => {
      const { actions, store } = createMockReduxStore({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockState.template.present,
          appliedTemplate: mockMMSTemplate,
        }),
      });
      store.dispatch(submitFileMetadataUpdate());
      expect(
        actions.includesMatch(
          setErrorAlert("Cannot submit update: no template has been applied")
        )
      );
    });
    it("adds jobName to payload if current job is defined", async () => {
      stubMethods();
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(
        actions.includes({
          ...submitFileMetadataUpdate(),
          payload: "file1, file2, file3",
        })
      );
    });
    it("deletes any file that is found on the selectedJob but not in uploads", async () => {
      const {
        deleteFileMetadataStub,
        updateJobStub,
        editFileMetadataStub,
      } = stubMethods();

      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(deleteFileMetadataStub.calledWith("dog", true)).to.be.true;
      expect(deleteFileMetadataStub.calledWith("cat", true)).to.be.false;
      expect(
        updateJobStub.calledWith(
          mockSuccessfulUploadJob.jobId,
          match({ serviceFields: { deletedFileIds: ["dog"] } })
        )
      ).to.be.true;
      expect(editFileMetadataStub.calledWith("cat", match.object)).to.be.true;
      expect(editFileMetadataStub.calledWith("dog", match.object)).to.be.false;
      expect(actions.includesMatch(editFileMetadataSucceeded(jobName)));
      expect(
        actions.includesMatch(
          selectPage(Page.AddCustomData, Page.UploadSummary)
        )
      );
    });
    it("ignores 404s when deleting files", async () => {
      const deleteFileMetadataStub = stub().rejects({
        status: HTTP_STATUS.NOT_FOUND,
      });
      const { updateJobStub, editFileMetadataStub } = stubMethods(
        deleteFileMetadataStub
      );
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(deleteFileMetadataStub.called).to.be.true;
      expect(updateJobStub.called).to.be.true;
      expect(editFileMetadataStub.called).to.be.true;
      expect(actions.includesMatch(editFileMetadataSucceeded(jobName)));
    });
    it("dispatches editFileMetadataFailed when deleting file fails (non-404)", async () => {
      const deleteFileMetadataStub = stub().rejects({
        response: {
          data: {
            error: "foo",
          },
          status: HTTP_STATUS.BAD_REQUEST,
        },
      });
      const { updateJobStub, editFileMetadataStub } = stubMethods(
        deleteFileMetadataStub
      );
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(deleteFileMetadataStub.called).to.be.true;
      expect(updateJobStub.called).to.be.false;
      expect(editFileMetadataStub.called).to.be.false;
      expect(
        actions.includesMatch(
          editFileMetadataFailed("Could not delete file dog: foo", jobName)
        )
      );
    });
    it("dispatches editFileMetadataFailed when updating job fails", async () => {
      const updateJobStub = stub().rejects(new Error("foo"));
      stubMethods(undefined, updateJobStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          editFileMetadataFailed(
            "Could not update upload with deleted fileIds: foo",
            jobName
          )
        )
      ).to.be.true;
    });
    it("dispatches editFileMetadataFailed when edit file metadata request fails", async () => {
      const editFileMetadataStub = stub().rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
      stubMethods(undefined, undefined, editFileMetadataStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          editFileMetadataFailed("Could not edit files: foo", jobName)
        )
      );
    });
  });
});
