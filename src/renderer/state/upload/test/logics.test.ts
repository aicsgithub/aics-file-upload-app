import { expect } from "chai";
import { keys } from "lodash";
import * as moment from "moment";
import {
  createSandbox,
  createStubInstance,
  SinonStubbedInstance,
  stub,
} from "sinon";

import {
  CANCEL_BUTTON_INDEX,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
} from "../../../constants";
import FileManagementSystem from "../../../services/fms-client";
import { StartUploadResponse } from "../../../services/fss-client";
import JobStatusClient from "../../../services/job-status-client";
import { ColumnType } from "../../../services/labkey-client/types";
import MMSClient from "../../../services/mms-client";
import { requestFailed } from "../../actions";
import { setErrorAlert } from "../../feedback/actions";
import { getAlert } from "../../feedback/selectors";
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
  mockJob,
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
import { AsyncRequest, FileModel, Page, State } from "../../types";
import {
  addUploadFiles,
  applyTemplate,
  cancelUpload,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  initiateUpload,
  initiateUploadFailed,
  openUploadDraft,
  retryUpload,
  saveUploadDraft,
  saveUploadDraftSuccess,
  submitFileMetadataUpdate,
  updateSubImages,
  updateUpload,
  updateUploadRows,
  uploadFailed,
} from "../actions";
import {
  getUploadRowKey,
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_SUCCEEDED,
  REPLACE_UPLOAD,
  SAVE_UPLOAD_DRAFT_SUCCESS,
  UPLOAD_FAILED,
  UPLOAD_SUCCEEDED,
} from "../constants";
import uploadLogics from "../logics";
import { getUpload, getUploadAsTableRows } from "../selectors";
import { UpdateSubImagesPayload, UploadTableRow } from "../types";

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
            [WELL_ANNOTATION_NAME]: [1],
          },
        }),
      });
      const expectedAction = setAppliedTemplate(mockMMSTemplate, {
        [getUploadRowKey({ file: "/path/to/file1" })]: {
          ["Favorite Color"]: [],
          file: "/path/to/file1",
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
    const jobName = "file1";
    const files = "file1, file2, file3";

    it("adds job name to action payload, dispatches initiateUploadSucceeded and selectPageActions", async () => {
      fms.startUpload.resolves(startUploadResponse);
      jssClient.existsById.resolves(true);
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
          type: INITIATE_UPLOAD,
        })
      ).to.be.true;
      expect(actions.list.find((a) => a.type === INITIATE_UPLOAD_SUCCEEDED)).to
        .not.be.undefined;
      // Assert that each upload used the same groupId
      const groupIds = new Set(
        fms.startUpload.getCalls().map((call) => call.args[2]?.groupId)
      );
      expect(groupIds).to.be.lengthOf(1);
      expect(groupIds).to.not.be.lengthOf(fms.startUpload.callCount);
    });

    it("sets error alert given validation error", async () => {
      fms.startUpload.rejects(new Error("foo"));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(initiateUploadFailed(files, "foo"))).to.be
        .true;
    });

    it("does not continue upload given upload directory request failure", async () => {
      fms.startUpload.rejects(new Error("foo"));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch({ type: INITIATE_UPLOAD_SUCCEEDED })).to.be
        .false;
      expect(actions.includesMatch({ type: UPLOAD_FAILED })).to.be.false;
      expect(actions.includesMatch({ type: UPLOAD_SUCCEEDED })).to.be.false;
    });

    it("initiates upload given OK response from validateMetadataAndGetUploadDirectory", async () => {
      fms.startUpload.resolves(startUploadResponse);
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );
      jssClient.existsById.resolves(true);
      // before
      expect(fms.uploadFile.called).to.be.false;

      // apply
      store.dispatch(initiateUpload());

      // after
      await logicMiddleware.whenComplete();
      expect(fms.uploadFile.called).to.be.true;
    });

    it("dispatches uploadFailed if uploadFile fails error", async () => {
      fms.startUpload.resolves(startUploadResponse);
      jssClient.existsById.resolves(true);
      const errorMessage = "uploadFile failed";
      fms.uploadFile.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          uploadFailed(`Upload ${jobName} failed: ${errorMessage}`, jobName)
        )
      ).to.be.true;
    });
  });
  describe("retryUploadLogic", () => {
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
    let fileRow: UploadTableRow | undefined;
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
      fileRow = getUploadAsTableRows(oneFileUploadMockState).find(
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
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 0,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        scene: 0,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: undefined,
        scene: undefined,
        subImageName: undefined,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 1,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        scene: 1,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        subImageName: "foo",
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 1,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        positionIndex: 1,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        scene: 1,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        scene: 1,
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        subImageName: "foo",
        [WELL_ANNOTATION_NAME]: [],
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
        [NOTES_ANNOTATION_NAME]: [],
        subImageName: "foo",
        [WELL_ANNOTATION_NAME]: [],
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": [],
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": [],
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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
      expect(upload[uploadRowKey][annotation][0]).to.be.instanceOf(Date);
    });
    it("converts strings to arrays of strings if type is TEXT", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Another Garbage Text Annotation": [],
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            [mockTextAnnotation.name]: [],
            file: "/path/to/file3",
            [NOTES_ANNOTATION_NAME]: [],
            templateId: 8,
            [WELL_ANNOTATION_NAME]: [],
            wellLabels: [],
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

  describe("addUploadFilesLogic", () => {
    it("applies selected templated over saved template", async () => {
      // arrange
      const templateId = 17;
      const badTemplateId = 4;
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            templateId,
          },
        },
        setting: {
          ...mockState.setting,
          templateId: badTemplateId,
        },
      });

      // act
      store.dispatch(addUploadFiles([]));
      await logicMiddleware.whenComplete();

      // assert
      expect(actions.includesMatch(applyTemplate(badTemplateId))).to.be.false;
      expect(actions.includesMatch(applyTemplate(templateId))).to.be.true;
    });

    it("applies saved template", async () => {
      // arrange
      const templateId = 17;
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        setting: {
          ...mockState.setting,
          templateId,
        },
      });

      // act
      store.dispatch(addUploadFiles([]));
      await logicMiddleware.whenComplete();

      // assert
      expect(actions.includesMatch(applyTemplate(templateId))).to.be.true;
    });
  });

  describe("updateUploadRowsLogic", () => {
    it("updates a single upload", () => {
      // arrange
      const uploadRowKey = getUploadRowKey({ file: "/path/to/file1" });

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
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
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
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
        template: {
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
        },
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
      const writeFileStub = stub().rejects(new Error("uh oh!"));
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
      ).to.be.true;
    });
    it("shows open dialog and replaces upload using data from reading file selected by user", async () => {
      const showMessageBoxStub = stub().resolves({ response: 1 });
      const showOpenDialogStub = stub().resolves({
        cancelled: false,
        filePaths: ["/foo"],
      });
      const readFileStub = stub().resolves(JSON.stringify(mockState));
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      sandbox.replace(dialog, "showOpenDialog", showOpenDialogStub);
      sandbox.replace(mockReduxLogicDeps, "readFile", readFileStub);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      expect(showOpenDialogStub.called).to.be.true;
      expect(actions.includesMatch({ type: REPLACE_UPLOAD })).to.be.true;
    });
  });
  describe("submitFileMetadataUpdateLogic", () => {
    let mockStateForEditingMetadata: State;
    let catUpload: FileModel | undefined;
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
      jobName = mockSuccessfulUploadJob.jobName || "";
    });

    afterEach(() => {
      mmsClient.deleteFileMetadata.restore();
      jssClient.updateJob.restore();
      mmsClient.editFileMetadata.restore();
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
          editFileMetadataFailed("Could not edit file: foo", jobName)
        )
      ).to.be.true;
    });
  });
  describe("cancelUpload", () => {
    it("dispatches cancel success action upon successful cancellation", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      // Act
      store.dispatch(cancelUpload({ ...mockJob, key: "myJob" }));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(cancelUploadSucceeded(mockJob.jobName as string))
      ).to.be.true;
    });
    it("dispatches cancelUploadFailed if cancelling the upload failed", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );
      const errorMessage = "foo";
      fms.cancelUpload.rejects(new Error(errorMessage));

      // Act
      store.dispatch(cancelUpload({ ...mockJob, key: "myJob" }));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          cancelUploadFailed(
            mockJob.jobName as string,
            `Cancel upload ${mockJob.jobName} failed: ${errorMessage}`
          )
        )
      ).to.be.true;
    });
  });
});
