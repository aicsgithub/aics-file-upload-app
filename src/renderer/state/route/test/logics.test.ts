import { expect } from "chai";
import { ActionCreator, Store } from "redux";
import {
  createSandbox,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import {
  CANCEL_BUTTON_INDEX,
  SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
  WELL_ANNOTATION_NAME,
} from "../../../constants";
import FileManagementSystem from "../../../services/fms-client";
import JobStatusClient from "../../../services/job-status-client";
import { JSSJobStatus } from "../../../services/job-status-client/types";
import LabkeyClient from "../../../services/labkey-client";
import MMSClient from "../../../services/mms-client";
import { requestFailed } from "../../actions";
import { REQUEST_FAILED } from "../../constants";
import { getAlert } from "../../feedback/selectors";
import { getFileMetadataForJob } from "../../metadata/selectors";
import { setHasNoPlateToUpload } from "../../selection/actions";
import { getSelectedPlate } from "../../selection/selectors";
import { getAppliedTemplate } from "../../template/selectors";
import { Actions } from "../../test/action-tracker";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockFailedUploadJob,
  mockFavoriteColorAnnotation,
  mockMMSTemplate,
  mockState,
  mockSuccessfulUploadJob,
  mockWellAnnotation,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { AlertType, AsyncRequest, Logger, Page, State } from "../../types";
import { getUploadRowKey } from "../../upload/constants";
import { getUpload } from "../../upload/selectors";
import { closeUpload, openJobAsUpload } from "../actions";
import { OPEN_JOB_AS_UPLOAD_SUCCEEDED } from "../constants";
import { setSwitchEnvEnabled } from "../logics";
import { getPage, getView } from "../selectors";
import Menu = Electron.Menu;

describe("Route logics", () => {
  const sandbox = createSandbox();
  let mmsClient: SinonStubbedInstance<MMSClient>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  let fms: SinonStubbedInstance<FileManagementSystem>;
  let jssClient: SinonStubbedInstance<JobStatusClient>;

  beforeEach(() => {
    mmsClient = createStubInstance(MMSClient);
    labkeyClient = createStubInstance(LabkeyClient);
    fms = createStubInstance(FileManagementSystem);
    jssClient = createStubInstance(JobStatusClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("setSwitchEnvEnabled", () => {
    let switchEnv: { enabled: boolean; label: string };
    let fileMenu: {
      label: string;
      submenu: { items: Array<{ enabled: boolean; label: string }> };
    };
    let menu: Menu;
    let logger: Logger;
    const logError: SinonStub = stub();

    beforeEach(() => {
      logger = ({
        error: logError,
      } as any) as Logger;
      switchEnv = {
        enabled: true,
        label: "Switch Environment",
      };
      fileMenu = {
        label: "file",
        submenu: {
          items: [switchEnv],
        },
      };
      menu = ({
        items: [fileMenu],
      } as any) as Menu;
    });

    it("logs error if file menu not found", () => {
      stub(fileMenu, "label").value("Edit");
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("logs error if file submenu not found", () => {
      stub(fileMenu, "submenu").value(undefined);
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("logs error if Switch Environment menu option not found", () => {
      stub(fileMenu, "submenu").value({ items: [] });
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("sets Switch Environment menu option to enabled if enabled=true", () => {
      stub(switchEnv, "enabled").value(false);
      expect(switchEnv.enabled).to.be.false;
      setSwitchEnvEnabled(menu, true, logger);
      expect(switchEnv.enabled).to.be.true;
    });
    it("sets Switch Environment menu option to disabled if enabled=false", () => {
      stub(switchEnv, "enabled").value(true);
      expect(switchEnv.enabled).to.be.true;
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.false;
    });
  });

  /**
   * helper function for go back and closeUpload logic tests
   * @param startPage the page we start on
   * @param expectedEndPage the page we expect to end at,
   * @param action action creator to dispatch
   * @param messageBoxResponse button index to simulate user click
   * changes and go back
   * @param state
   */
  const runShowMessageBoxTest = async (
    startPage: Page,
    expectedEndPage: Page,
    action: ActionCreator<any>,
    messageBoxResponse = 1,
    state: State = mockState
  ): Promise<{
    actions: Actions;
    showMessageBoxStub: SinonStub;
    store: Store;
  }> => {
    const showMessageBoxStub = stub().resolves({
      response: messageBoxResponse,
    });
    sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
    const { actions, logicMiddleware, store } = createMockReduxStore({
      ...state,
      route: {
        page: startPage,
        view: startPage,
      },
      upload: getMockStateWithHistory(mockWellUpload),
    });

    expect(getPage(store.getState())).to.equal(startPage);
    expect(getView(store.getState())).to.equal(startPage);
    expect(showMessageBoxStub.called).to.be.false;

    store.dispatch(action());

    await logicMiddleware.whenComplete();
    expect(getPage(store.getState())).to.equal(expectedEndPage);
    expect(getView(store.getState())).to.equal(expectedEndPage);
    expect(showMessageBoxStub.called).to.be.true;
    return { actions, showMessageBoxStub, store };
  };

  describe("resetUploadLogic", () => {
    it("goes to UploadSummary page given user clicks Save Upload Draft from dialog", async () => {
      const showSaveDialogStub = stub().resolves({
        cancelled: false,
        filePath: "/bar",
      });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      await runShowMessageBoxTest(
        Page.AddCustomData,
        Page.UploadSummary,
        closeUpload,
        2
      );
      expect(showSaveDialogStub.called).to.be.true;
    });
    it("stays on current page given 'Cancel' clicked from dialog", async () => {
      await runShowMessageBoxTest(
        Page.AddCustomData,
        Page.AddCustomData,
        closeUpload,
        0
      );
    });
  });
  describe("openJobAsUploadLogic", () => {
    const fileMetadata = {
      fileId: "abcdefg",
      filename: "name",
      fileSize: 1,
      fileType: "image",
      localFilePath: "/localFilePath",
      modified: "",
      modifiedBy: "foo",
    };

    const stubMethods = ({
      showMessageBox,
      showSaveDialog,
      writeFile,
    }: {
      showMessageBox?: SinonStub;
      showSaveDialog?: SinonStub;
      writeFile?: SinonStub;
    }) => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        showMessageBox || stub().resolves({ response: 1 }) // discard draft by default
      );
      sandbox.replace(
        dialog,
        "showSaveDialog",
        showSaveDialog ||
          stub().resolves({ cancelled: false, filePath: "/test" })
      );
      sandbox.replace(
        mockReduxLogicDeps,
        "writeFile",
        writeFile || stub().resolves()
      );
      labkeyClient.selectFirst.resolves(fileMetadata);
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [
          {
            annotationId: mockFavoriteColorAnnotation.annotationId,
            values: ["Blue", "Green"],
          },
          {
            annotationId: mockWellAnnotation.annotationId,
            values: ["A1", "B6"],
          },
        ],
      });
      labkeyClient.getPlateBarcodeAndAllImagingSessionIdsFromWellId.resolves(
        "abc"
      );
      labkeyClient.getImagingSessionIdsForBarcode.resolves([null, 1]);
      mmsClient.getPlate.resolves({
        plate: {
          ...mockAuditInfo,
          barcode: "123456",
          comments: "",
          imagingSessionId: undefined,
          plateGeometryId: 1,
          plateId: 1,
          plateStatusId: 1,
          seededOn: "2018-02-14 23:03:52",
        },
        wells: [],
      });
      mmsClient.getTemplate.resolves(mockMMSTemplate);
    };

    let mockStateWithMetadata: State;
    beforeEach(() => {
      mockStateWithMetadata = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationOptions: mockAnnotationOptions,
          annotationTypes: mockAnnotationTypes,
          annotations: mockAnnotations,
        },
        route: {
          ...mockState.route,
          page: Page.UploadSummary,
          view: Page.UploadSummary,
        },
        selection: getMockStateWithHistory({
          ...mockState.selection.present,
          barcode: undefined,
          imagingSessionId: undefined,
          imagingSessionIds: [],
          job: undefined,
          plate: {},
          selectedWells: [],
          stagedFiles: [],
          wells: {},
        }),
        upload: getMockStateWithHistory({}),
      };
    });
    it("doesn't do anything if user cancels action when asked to save current draft", async () => {
      stubMethods({
        showMessageBox: stub().resolves({ response: CANCEL_BUTTON_INDEX }),
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch({ type: "ignore" })).to.be.true;
      expect(actions.list.find((a) => a.type === OPEN_JOB_AS_UPLOAD_SUCCEEDED))
        .to.be.undefined;
      expect(actions.list.find((a) => a.type === REQUEST_FAILED)).to.be
        .undefined;
    });
    it("shows save dialog if user has another draft open", async () => {
      const showSaveDialog = stub().resolves({
        cancelled: false,
        filePath: "/foo",
      });
      stubMethods({
        showMessageBox: stub().resolves({
          response: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
        }),
        showSaveDialog,
      });
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(showSaveDialog.called).to.be.true;
    });
    it("shows save dialog if user is editing another upload", async () => {
      const showSaveDialog = stub().resolves({
        cancelled: false,
        filePath: "/foo",
      });
      stubMethods({
        showMessageBox: stub().resolves({
          response: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
        }),
        showSaveDialog,
      });
      const { logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...nonEmptyStateForInitiatingUpload.selection.present,
          job: { ...mockSuccessfulUploadJob, jobId: "anotherjobid" },
        }),
      });

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(showSaveDialog.called).to.be.true;
    });
    it("sets error alert if job passed is missing information", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(
        openJobAsUpload({
          ...mockSuccessfulUploadJob,
          status: JSSJobStatus.FAILED,
        })
      );
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal("upload has missing information");
    });
    it("sets error alert if something fails while showing the warning dialog", async () => {
      const showMessageBox = stub().resolves({
        response: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
      });
      const writeFile = stub().rejects(new Error("foo"));
      stubMethods({ showMessageBox, writeFile });
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal("Could not save draft: foo");
    });
    it("sets error alert if all files for the job have since been deleted", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      expect(getAlert(store.getState())).to.be.undefined;

      store.dispatch(
        openJobAsUpload({
          ...mockSuccessfulUploadJob,
          serviceFields: {
            ...mockSuccessfulUploadJob.serviceFields,
            deletedFileIds: ["cat", "dog"],
          },
        })
      );
      await logicMiddleware.whenComplete();

      const alert = getAlert(store.getState());
      expect(alert).to.deep.equal({
        message: "All files in this upload have been deleted!",
        type: AlertType.ERROR,
      });
    });
    it("allows users to open a failed upload", async () => {
      stubMethods({});
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      store.dispatch(openJobAsUpload(mockFailedUploadJob));
      await logicMiddleware.whenComplete();

      expect(actions.list.map(({ type }) => type)).includes(
        OPEN_JOB_AS_UPLOAD_SUCCEEDED
      );
    });
    it("handles case where upload tab is not open yet", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      let state = store.getState();
      expect(getPage(state)).to.equal(Page.UploadSummary);
      expect(getView(state)).to.equal(Page.UploadSummary);
      expect(getFileMetadataForJob(state)).to.be.undefined;
      expect(getUpload(state)).to.be.empty;
      expect(getAppliedTemplate(state)).to.be.undefined;

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      state = store.getState();
      expect(getPage(state)).to.equal(Page.AddCustomData);
      expect(getView(state)).to.equal(Page.AddCustomData);
      expect(getUpload(state)).to.deep.equal({
        [getUploadRowKey({ file: fileMetadata.localFilePath || "" })]: {
          file: fileMetadata.localFilePath,
          fileId: "dog",
          "Favorite Color": ["Blue", "Green"],
          [WELL_ANNOTATION_NAME]: ["A1", "B6"],
          channelId: undefined,
          fovId: undefined,
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
        },
      });
      expect(getAppliedTemplate(state)).to.not.be.undefined;
    });
    it("dispatches requestFailed if boolean annotation type id is not defined", async () => {
      stubMethods({});
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [],
      });
      const { actions, logicMiddleware, store } = createMockReduxStore();

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            `Could not open upload editor: Boolean annotation type id not found. Contact Software.`,
            AsyncRequest.GET_FILE_METADATA_FOR_JOB
          )
        )
      ).to.be.true;
    });
    it("dispatches requestFailed given not OK response when getting file metadata", async () => {
      const errorMessage = "lk failure";
      labkeyClient.selectFirst.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState
      );

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            `Could not open upload editor: ${errorMessage}`,
            AsyncRequest.GET_FILE_METADATA_FOR_JOB
          )
        )
      ).to.be.true;
    });
    it("does not dispatch setPlate action if file metadata does not contain well annotation", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(getSelectedPlate(store.getState())).to.be.undefined;
      expect(actions.includesMatch(setHasNoPlateToUpload(true)));
    });
    it("sets upload error if something goes wrong while trying to get and set plate info", async () => {
      stubMethods({});
      const errorMessage = "foo";
      mmsClient.getPlate.rejects(new Error(errorMessage));
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [
          { ...mockFavoriteColorAnnotation, values: ["Blue", "Green"] },
          { ...mockWellAnnotation, values: ["A1", "B6"] },
        ],
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );
      const expectedAction = requestFailed(
        `Could not open upload editor: ${errorMessage}`,
        AsyncRequest.GET_FILE_METADATA_FOR_JOB
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(expectedAction)).to.be.true;
    });
    it("dispatches requestFailed if getting template fails", async () => {
      stubMethods({});
      const errorMessage = "foo";
      mmsClient.getTemplate.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );
      const expectedAction = requestFailed(
        `Could not open upload editor: ${errorMessage}`,
        AsyncRequest.GET_FILE_METADATA_FOR_JOB
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(openJobAsUpload(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(expectedAction)).to.be.true;
    });
  });
});
