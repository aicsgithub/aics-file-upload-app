import { expect } from "chai";
import { get, keys } from "lodash";
import * as moment from "moment";
import {
  createSandbox,
  createStubInstance,
  match,
  SinonStubbedInstance,
  stub,
} from "sinon";

import {
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../../constants";
import { FileManagementSystem } from "../../../services/aicsfiles";
import { mockJob } from "../../../services/aicsfiles/test/mocks";
import {
  StartUploadResponse,
  UploadServiceFields,
} from "../../../services/aicsfiles/types";
import JobStatusClient from "../../../services/job-status-client";
import {
  JSSJob,
  JSSJobStatus,
} from "../../../services/job-status-client/types";
import { ColumnType } from "../../../services/labkey-client/types";
import MMSClient from "../../../services/mms-client";
import { CANCEL_BUTTON_INDEX } from "../../../util";
import { requestFailed } from "../../actions";
import { REQUEST_FAILED } from "../../constants";
import { setErrorAlert } from "../../feedback/actions";
import { getAlert } from "../../feedback/selectors";
import { getCurrentJobName } from "../../job/selectors";
import { closeUpload, selectPage } from "../../route/actions";
import { setAppliedTemplate } from "../../template/actions";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationTypes,
  mockDateAnnotation,
  mockFailedUploadJob,
  mockMMSTemplate,
  mockNumberAnnotation,
  mockSelection,
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
  cancelUpload,
  cancelUploadFailed,
  cancelUploadSucceeded,
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
  updateAndRetryUpload,
  updateSubImages,
  updateUpload,
  updateUploadRows,
  uploadFailed,
} from "../actions";
import {
  CANCEL_UPLOAD,
  getUploadRowKey,
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_SUCCEEDED,
  SAVE_UPLOAD_DRAFT_SUCCESS,
} from "../constants";
import uploadLogics, { cancelUploadLogic } from "../logics";
import { getUpload, getUploadSummaryRows } from "../selectors";
import { UpdateSubImagesPayload, UploadJobTableRow } from "../types";

describe("Upload logics", () => {
  const sandbox = createSandbox();
  let fms: SinonStubbedInstance<FileManagementSystem>;
  let jssClient: SinonStubbedInstance<JobStatusClient>;
  let mmsClient: SinonStubbedInstance<MMSClient>;

  beforeEach(() => {
    fms = createStubInstance(FileManagementSystem);
    jssClient = createStubInstance(JobStatusClient);
    mmsClient = createStubInstance(MMSClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
  });

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

      const upload = getUpload(store.getState());
      expect(get(upload, [file1, WELL_ANNOTATION_NAME, 0])).to.equal(wellId);
      expect(get(upload, [file2, WELL_ANNOTATION_NAME, 0])).to.equal(wellId);
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

      const upload = getUpload(store.getState());
      const uploadRowKey = getUploadRowKey({ file: file1, positionIndex: 1 });
      expect(get(upload, [uploadRowKey, WELL_ANNOTATION_NAME, 0])).to.equal(
        wellId
      );
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
      mmsClient.getTemplate.rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
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
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file" }),
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      const expectedAction = setAppliedTemplate(mockMMSTemplate, {
        [getUploadRowKey({ file: "/path/to/file1" })]: {
          ["Favorite Color"]: [],
          file: "/path/to/file1",
          key: getUploadRowKey({ file: "/path/to/file" }),
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
      fms.validateMetadataAndGetUploadDirectory.resolves(startUploadResponse);
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
      expect(actions.includesMatch(selectPage(Page.UploadSummary)));
    });

    it("sets error alert given validation error", async () => {
      fms.validateMetadataAndGetUploadDirectory.rejects(new Error("foo"));
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

    it("initiates upload given OK response from validateMetadataAndGetUploadDirectory", async () => {
      fms.validateMetadataAndGetUploadDirectory.resolves(startUploadResponse);
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );
      // before
      expect(fms.uploadFiles.called).to.be.false;

      // apply
      store.dispatch(initiateUpload());

      // after
      await logicMiddleware.whenComplete();
      expect(fms.uploadFiles.called).to.be.true;
    });
    it("dispatches uploadFailed if uploadFiles fails error", async () => {
      fms.validateMetadataAndGetUploadDirectory.resolves(startUploadResponse);
      fms.uploadFiles.rejects(new Error("error message"));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          uploadFailed(`Upload ${jobName} failed: error message`, jobName)
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
      store.dispatch(retryUpload(uploadJob));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          setErrorAlert(
            "Not enough information to retry upload. Contact Software."
          )
        )
      ).to.be.true;
    });
    it("calls fms.retryUpload if no missing info on job", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = { ...mockFailedUploadJob, jobName: "bar", key: "foo" };
      store.dispatch(retryUpload(uploadJob));
      await logicMiddleware.whenComplete();

      expect(fms.retryUpload.called).to.be.true;
    });
    it("dispatches uploadFailed fms.retryUpload throws exception", async () => {
      fms.retryUpload.rejects(new Error("error"));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = { ...mockFailedUploadJob, key: "foo" };
      store.dispatch(retryUpload(uploadJob));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          uploadFailed(
            `Retry upload ${mockFailedUploadJob.jobName} failed: error`,
            mockFailedUploadJob.jobName || ""
          )
        )
      ).to.be.true;
      expect(fms.retryUpload.called).to.be.true;
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
            file: "/path/to/file1",
            key: fileRowKey,
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
              channelIds: [mockChannel],
              file: "/path/to/file1",
              positionIndexes: [1, 2],
              [WELL_ANNOTATION_NAME]: [],
            },
            [position1Key]: {
              file: "/path/to/file1",
              positionIndex: 1,
              [WELL_ANNOTATION_NAME]: [1],
            },
            [position1Channel1Key]: {
              channelId: mockChannel,
              file: "/path/to/file1",
              positionIndex: 1,
              [WELL_ANNOTATION_NAME]: [],
            },
            [position2Key]: {
              file: "/path/to/file1",
              positionIndex: 2,
              [WELL_ANNOTATION_NAME]: [2],
            },
            [position2Channel1Key]: {
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
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
            file: "/path/to/file1",
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });

      const favoriteColor = "Red";

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey], { "Favorite Color": favoriteColor })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey]["Favorite Color"]).to.equal(favoriteColor);
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
            file: "/path/to/file1",
            [WELL_ANNOTATION_NAME]: [],
          },
          [uploadRowKey2]: {
            file: "/path/to/file2",
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });

      const favoriteColor = "123456";

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey1, uploadRowKey2], {
          "Favorite Color": favoriteColor,
        })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey1]["Favorite Color"]).to.equal(favoriteColor);
      expect(upload[uploadRowKey2]["Favorite Color"]).to.equal(favoriteColor);
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

    afterEach(() => {
      mmsClient.deleteFileMetadata.restore();
      jssClient.updateJob.restore();
      mmsClient.editFileMetadata.restore();
    });

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
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(mmsClient.deleteFileMetadata.calledWith("dog", true)).to.be.true;
      expect(mmsClient.deleteFileMetadata.calledWith("cat", true)).to.be.false;
      expect(
        jssClient.updateJob.calledWith(
          mockSuccessfulUploadJob.jobId,
          match({ serviceFields: { deletedFileIds: ["dog"] } })
        )
      ).to.be.true;
      expect(mmsClient.editFileMetadata.calledWith("cat", match.object)).to.be
        .true;
      expect(mmsClient.editFileMetadata.calledWith("dog", match.object)).to.be
        .false;
      expect(actions.includesMatch(editFileMetadataSucceeded(jobName)));
      expect(actions.includesMatch(selectPage(Page.UploadSummary)));
    });
    it("ignores 404s when deleting files", async () => {
      mmsClient.deleteFileMetadata.rejects({
        status: HTTP_STATUS.NOT_FOUND,
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(mmsClient.deleteFileMetadata.called).to.be.true;
      expect(jssClient.updateJob.called).to.be.true;
      expect(mmsClient.editFileMetadata.called).to.be.true;
      expect(actions.includesMatch(editFileMetadataSucceeded(jobName)));
    });
    it("dispatches editFileMetadataFailed when deleting file fails (non-404)", async () => {
      mmsClient.deleteFileMetadata.rejects({
        response: {
          data: {
            error: "foo",
          },
          status: HTTP_STATUS.BAD_REQUEST,
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(mmsClient.deleteFileMetadata.called).to.be.true;
      expect(jssClient.updateJob.called).to.be.false;
      expect(mmsClient.editFileMetadata.called).to.be.false;
      expect(
        actions.includesMatch(
          editFileMetadataFailed("Could not delete file dog: foo", jobName)
        )
      );
    });
    it("dispatches editFileMetadataFailed when updating job fails", async () => {
      jssClient.updateJob.rejects(new Error("foo"));
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
      mmsClient.editFileMetadata.rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
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
  describe("cancelUpload", () => {
    it("sets alert if job is not defined", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      store.dispatch({
        type: CANCEL_UPLOAD,
      });
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          setErrorAlert("Cannot cancel undefined upload job")
        )
      ).to.be.true;
    });
    it("shows dialog and allows user to cancel if they change their mind", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 0 }); // cancel button

      store.dispatch(cancelUpload({ ...mockJob, key: "key" }));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.list).to.deep.equal([{ type: "ignore" }]);
    });
    it("shows dialog and allows user to continue and dispatches cancelUploadSucceeded if cancelling the upload succeeded", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const jobName = "bar";
      const job = { ...mockJob, jobName, key: "key" };

      store.dispatch(cancelUpload(job));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.includesMatch(cancelUpload(job))).to.be.true;
      expect(actions.includesMatch(cancelUploadSucceeded(jobName))).to.be.true;
    });
    it("cancels all replacement jobs related to upload", async () => {
      const replacementJob: JSSJob<UploadServiceFields> = {
        ...mockFailedUploadJob,
        jobId: "replacement",
        serviceFields: {
          files: [],
          lastModified: {},
          md5: {},
          originalJobId: "original",
          type: "upload",
          uploadDirectory: "/foo",
        },
        status: JSSJobStatus.RETRYING,
      };
      const originalJob: JSSJob<UploadServiceFields> = {
        ...mockFailedUploadJob,
        jobId: "original",
        serviceFields: {
          files: [],
          lastModified: {},
          md5: {},
          replacementJobIds: ["replacement"],
          type: "upload",
          uploadDirectory: "/foo",
        },
      };
      const { logicMiddleware, store } = createMockReduxStore(
        {
          ...mockState,
          job: {
            ...mockState.job,
            uploadJobs: [originalJob, replacementJob],
          },
        },
        undefined,
        [cancelUploadLogic]
      );
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const job = { ...replacementJob, key: "replacement" };

      store.dispatch(cancelUpload(job));
      await logicMiddleware.whenComplete();

      expect(fms.failUpload.calledWith("replacement")).to.be.true;
      expect(fms.failUpload.calledWith("original")).to.be.true;
    });
    it("dispatches cancelUploadFailed if cancelling the upload failed", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const job = { ...mockJob, jobName: "jobName", key: "key" };
      fms.failUpload.rejects(new Error("foo"));

      store.dispatch(cancelUpload(job));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.includesMatch(cancelUpload(job))).to.be.true;
      expect(
        actions.includesMatch(
          cancelUploadFailed(
            "jobName",
            `Cancel upload ${job.jobName} failed: foo`
          )
        )
      ).to.be.true;
    });
  });
  describe("updateAndRetryUpload", () => {
    let nonEmptyState: State;
    beforeEach(() => {
      nonEmptyState = {
        ...nonEmptyStateForInitiatingUpload,
        route: {
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          job: { ...mockFailedUploadJob, jobName: "bar" },
        }),
      };
    });
    it("sets error alert if no job selected", async () => {
      const { actions, store, logicMiddleware } = createMockReduxStore();
      store.dispatch(updateAndRetryUpload());
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(setErrorAlert("No upload selected"))).to.be
        .true;
      expect(actions.list.length).to.equal(1);
    });
    it("sets error alert if selected job is not retryable", async () => {
      const { actions, store, logicMiddleware } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockSelection,
          job: mockSuccessfulUploadJob,
        }),
      });
      store.dispatch(updateAndRetryUpload());
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(setErrorAlert("Selected job is not retryable"))
      ).to.be.true;
      expect(actions.list.length).to.equal(1);
    });
    it("(happy path) updates the selected job and retries if the job is retryable", async () => {
      const { actions, store, logicMiddleware } = createMockReduxStore(
        nonEmptyState
      );
      store.dispatch(updateAndRetryUpload());
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(closeUpload())).to.be.true;
      expect(actions.includesType(REQUEST_FAILED)).to.be.false;
      expect(jssClient.updateJob.called).to.be.true;
      expect(fms.retryUpload.called).to.be.true;
    });
    it("dispatches requestFailed if it cannot update the job", async () => {
      jssClient.updateJob.rejects(new Error("foo"));
      const { actions, store, logicMiddleware } = createMockReduxStore(
        nonEmptyState
      );
      store.dispatch(updateAndRetryUpload());
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not update and retry upload: foo",
            `${AsyncRequest.UPLOAD}-file1, file2, file3`
          )
        )
      ).to.be.true;
    });
    it("dispatches requestFailed if it cannot retry the job and attempts to revert job back to previous state", async () => {
      fms.retryUpload.rejects(new Error("foo"));
      const { actions, store, logicMiddleware } = createMockReduxStore(
        nonEmptyState
      );
      store.dispatch(updateAndRetryUpload());
      await logicMiddleware.whenComplete();
      expect(actions.includesMatch(closeUpload())).to.be.true;
      expect(
        actions.includesMatch(
          requestFailed(
            "Retry upload file1, file2, file3 failed: foo",
            `${AsyncRequest.UPLOAD}-file1, file2, file3`
          )
        )
      ).to.be.true;
      expect(jssClient.updateJob.calledTwice).to.be.true;
      expect(fms.retryUpload.called).to.be.true;
    });
  });
});
