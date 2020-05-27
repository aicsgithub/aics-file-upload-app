import { ImageModelMetadata } from "@aics/aicsfiles/type-declarations/types";
import { expect } from "chai";
import { omit } from "lodash";
import { ActionCreator } from "redux";
import { createSandbox, SinonStub, stub } from "sinon";

import {
  getAlert,
  getRequestsInProgressContains,
  getUploadError,
} from "../../feedback/selectors";
import { AlertType, AsyncRequest } from "../../feedback/types";
import {
  getFileMetadataForJob,
  getSelectionHistory,
  getTemplateHistory,
  getUploadHistory,
} from "../../metadata/selectors";
import {
  selectFile,
  selectWorkflowPath,
  selectWorkflows,
} from "../../selection/actions";
import {
  getCurrentSelectionIndex,
  getSelectedPlate,
} from "../../selection/selectors";
import {
  createMockReduxStore,
  dialog,
  fms,
  labkeyClient,
  mmsClient,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockMMSTemplate,
  mockSelectedWorkflows,
  mockState,
  mockSuccessfulUploadJob,
} from "../../test/mocks";
import { Logger, State } from "../../types";
import { associateFilesAndWorkflows } from "../../upload/actions";
import { getUploadRowKey } from "../../upload/constants";
import {
  getAppliedTemplateId,
  getCurrentUploadIndex,
  getUpload,
} from "../../upload/selectors";
import {
  closeUploadTab,
  goBack,
  openEditFileMetadataTab,
  selectPage,
} from "../actions";
import { setSwitchEnvEnabled } from "../logics";
import { getPage, getView } from "../selectors";
import { Page } from "../types";
import Menu = Electron.Menu;

describe("Route logics", () => {
  const sandbox = createSandbox();
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

  describe("selectPageLogic", () => {
    let switchEnv: { enabled: boolean; label: string };
    let fileMenu: {
      label: string;
      submenu: { items: Array<{ enabled: boolean; label: string }> };
    };
    let menu: Menu;

    beforeEach(() => {
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
      const getApplicationMenuStub = stub().returns(menu);
      sandbox.replace(
        mockReduxLogicDeps,
        "getApplicationMenu",
        getApplicationMenuStub
      );
    });

    // This is going forward
    it(
      "Going from DragAndDrop to SelectUploadType should record the index selection/template/upload state " +
        "branches were at after leaving that page",
      async () => {
        const { logicMiddleware, store } = createMockReduxStore({
          ...mockState,
          route: {
            page: Page.DragAndDrop,
            view: Page.DragAndDrop,
          },
        });

        // before
        let state = store.getState();
        expect(getSelectionHistory(state)).to.be.empty;
        expect(getTemplateHistory(state)).to.be.empty;
        expect(getUploadHistory(state)).to.be.empty;
        expect(getPage(state)).to.equal(Page.DragAndDrop);
        expect(switchEnv.enabled).to.be.true;

        // apply
        store.dispatch(selectPage(Page.DragAndDrop, Page.SelectUploadType));

        // after
        await logicMiddleware.whenComplete();
        state = store.getState();
        expect(getSelectionHistory(state)[Page.DragAndDrop]).to.equal(0);
        expect(getTemplateHistory(state)[Page.DragAndDrop]).to.equal(0);
        expect(getUploadHistory(state)[Page.DragAndDrop]).to.equal(0);
        expect(getPage(state)).to.equal(Page.SelectUploadType);
        expect(switchEnv.enabled).to.be.false;
      }
    );
    it(
      "Going from SelectUploadType to AssociateFiles should record which index selection/template/upload state " +
        "branches are at for the page we went to",
      async () => {
        const startingSelectionHistory = {
          [Page.SelectUploadType]: 0,
        };
        const startingTemplateHistory = {
          [Page.SelectUploadType]: 0,
        };
        const startingUploadHistory = {
          [Page.SelectUploadType]: 0,
        };
        const { logicMiddleware, store } = createMockReduxStore({
          ...mockState,
          metadata: {
            ...mockState.metadata,
            history: {
              selection: startingSelectionHistory,
              template: startingTemplateHistory,
              upload: startingUploadHistory,
            },
          },
          route: {
            page: Page.SelectUploadType,
            view: Page.SelectUploadType,
          },
        });
        let state = store.getState();
        expect(getSelectionHistory(state)).to.equal(startingSelectionHistory);
        expect(getTemplateHistory(state)).to.equal(startingTemplateHistory);
        expect(getUploadHistory(state)).to.equal(startingUploadHistory);

        store.dispatch(selectWorkflowPath());
        await logicMiddleware.whenComplete();

        // before
        expect(getCurrentSelectionIndex(store.getState())).to.be.equal(2);
        expect(switchEnv.enabled).to.be.false;

        // apply
        store.dispatch(selectPage(Page.SelectUploadType, Page.AssociateFiles));

        // after
        await logicMiddleware.whenComplete();
        state = store.getState();
        expect(getSelectionHistory(state)).to.deep.equal({
          ...startingSelectionHistory,
          [Page.SelectUploadType]: 2,
        });
        expect(getTemplateHistory(state)).to.deep.equal({
          ...startingTemplateHistory,
          [Page.SelectUploadType]: 0,
        });
        expect(getUploadHistory(state)).to.deep.equal({
          ...startingUploadHistory,
          [Page.SelectUploadType]: 0,
        });
        expect(getPage(state)).to.equal(Page.AssociateFiles);
        expect(switchEnv.enabled).to.be.false;
      }
    );
    it(
      "Going from SelectUploadType to DragAndDrop should change indexes for selection/template/upload to 0" +
        "back to where they were when the user left the DragAndDrop page",
      async () => {
        const startingSelectionHistory = {
          [Page.DragAndDrop]: 0,
        };
        const startingTemplateHistory = {
          [Page.DragAndDrop]: 0,
        };
        const startingUploadHistory = {
          [Page.DragAndDrop]: 0,
        };
        const { logicMiddleware, store } = createMockReduxStore({
          ...mockState,
          metadata: {
            ...mockState.metadata,
            history: {
              selection: startingSelectionHistory,
              template: startingTemplateHistory,
              upload: startingUploadHistory,
            },
          },
          route: {
            page: Page.SelectUploadType,
            view: Page.SelectUploadType,
          },
        });
        store.dispatch(selectWorkflowPath());
        await logicMiddleware.whenComplete();

        // before
        expect(getCurrentSelectionIndex(store.getState())).to.be.equal(2);
        expect(switchEnv.enabled).to.be.false;

        // apply
        store.dispatch(selectPage(Page.SelectUploadType, Page.DragAndDrop));

        // after
        await logicMiddleware.whenComplete();
        const state = store.getState();
        expect(getCurrentSelectionIndex(state)).to.equal(0);
        expect(getPage(state)).to.equal(Page.DragAndDrop);
        expect(switchEnv.enabled).to.be.true;
      }
    );
    it("Going to UploadSummary page should clear all upload information", async () => {
      const startingSelectionHistory = {
        [Page.DragAndDrop]: 0,
      };
      const startingTemplateHistory = {
        [Page.DragAndDrop]: 0,
      };
      const startingUploadHistory = {
        [Page.DragAndDrop]: 0,
      };
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          history: {
            selection: startingSelectionHistory,
            template: startingTemplateHistory,
            upload: startingUploadHistory,
          },
        },
        route: {
          page: Page.AssociateFiles,
          view: Page.AssociateFiles,
        },
      });
      store.dispatch(selectWorkflows(mockSelectedWorkflows));
      store.dispatch(selectFile("/path/to/file"));
      store.dispatch(
        associateFilesAndWorkflows(["/path/to/file"], mockSelectedWorkflows)
      );
      await logicMiddleware.whenComplete();

      // before
      expect(getCurrentSelectionIndex(store.getState())).to.be.greaterThan(1);
      expect(getCurrentUploadIndex(store.getState())).to.be.greaterThan(0);
      expect(switchEnv.enabled).to.be.true;

      store.dispatch(selectPage(Page.SelectUploadType, Page.UploadSummary));
      await logicMiddleware.whenComplete();

      const state = store.getState();
      // we dispatching the closeUploadTab action after clearing history
      expect(getCurrentSelectionIndex(state)).to.not.be.greaterThan(1);
      expect(getCurrentUploadIndex(store.getState())).to.not.be.greaterThan(1);
      expect(switchEnv.enabled).to.be.true;
    });
  });

  /**
   * helper function for go back and closeUploadTab logic tests
   * @param startPage the page we start on
   * @param expectedEndPage the page we expect to end at,
   * @param action action creator to dispatch
   * @param respondOKToDialog whether or not the user says OK to the dialog asking them if it's okay to lose their
   * changes and go back
   */
  const runShowMessageBoxTest = async (
    startPage: Page,
    expectedEndPage: Page,
    action: ActionCreator<any>,
    respondOKToDialog = true
  ) => {
    const { logicMiddleware, store } = createMockReduxStore({
      ...mockState,
      route: {
        page: startPage,
        view: startPage,
      },
    });

    const dialogResult = respondOKToDialog ? 1 : 0;
    const showMessageBoxStub = stub().callsArgWith(1, dialogResult);
    sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);

    expect(getPage(store.getState())).to.equal(startPage);
    expect(getView(store.getState())).to.equal(startPage);

    store.dispatch(action());

    await logicMiddleware.whenComplete();
    expect(getPage(store.getState())).to.equal(expectedEndPage);
    expect(getView(store.getState())).to.equal(expectedEndPage);
  };

  describe("goBackLogic", () => {
    it("goes to SelectStorageIntent page if going back from AddCustomData page", async () => {
      await runShowMessageBoxTest(
        Page.AddCustomData,
        Page.SelectStorageLocation,
        goBack
      );
    });
    it("goes to AssociateFiles page if going back from SelectStorageLocation page", async () => {
      await runShowMessageBoxTest(
        Page.SelectStorageLocation,
        Page.AssociateFiles,
        goBack
      );
    });
    it("goes to SelectUploadType page if going back from AssociateFiles page", async () => {
      await runShowMessageBoxTest(
        Page.AssociateFiles,
        Page.SelectUploadType,
        goBack
      );
    });
    it("goes to DragAndDrop page if going back from SelectUploadType page", async () => {
      await runShowMessageBoxTest(
        Page.SelectUploadType,
        Page.DragAndDrop,
        goBack
      );
    });
    it("goes to UploadSummary page if going back from DragAndDrop page", async () => {
      await runShowMessageBoxTest(Page.DragAndDrop, Page.UploadSummary, goBack);
    });
    it("does not change pages if user cancels the action through the dialog", async () => {
      await runShowMessageBoxTest(
        Page.SelectUploadType,
        Page.SelectUploadType,
        goBack,
        false
      );
    });
  });

  describe("closeUploadTabLogic", () => {
    it("goes to UploadSummary page given Yes from dialog", async () => {
      await runShowMessageBoxTest(
        Page.AssociateFiles,
        Page.UploadSummary,
        closeUploadTab
      );
    });
    it("stays on current page given Cancel from dialog", async () => {
      await runShowMessageBoxTest(
        Page.AssociateFiles,
        Page.AssociateFiles,
        closeUploadTab,
        false
      );
    });
  });
  describe("openEditFileMetadataTabLogic", () => {
    const fileMetadata: ImageModelMetadata[] = [
      {
        Well: [100],
        fileId: "abc123",
        fileSize: 100,
        fileType: "image",
        filename: "my file",
        localFilePath: "/localFilePath",
        modified: "",
        modifiedBy: "foo",
        template: "my template",
        templateId: 1,
      },
    ];

    const stubMethods = ({
      getCustomMetadataForFile,
      transformFileMetadataIntoTable,
      getPlateBarcodeAndAllImagingSessionIdsFromWellId,
      getImagingSessionIdsForBarcode,
      getPlate,
      getTemplate,
    }: {
      getCustomMetadataForFile?: SinonStub;
      transformFileMetadataIntoTable?: SinonStub;
      getPlateBarcodeAndAllImagingSessionIdsFromWellId?: SinonStub;
      getImagingSessionIdsForBarcode?: SinonStub;
      getPlate?: SinonStub;
      getTemplate?: SinonStub;
    }) => {
      sandbox.replace(
        fms,
        "getCustomMetadataForFile",
        getCustomMetadataForFile || stub().resolves([])
      );
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        transformFileMetadataIntoTable || stub().resolves(fileMetadata)
      );
      sandbox.replace(
        labkeyClient,
        "getPlateBarcodeAndAllImagingSessionIdsFromWellId",
        getPlateBarcodeAndAllImagingSessionIdsFromWellId ||
          stub().resolves("abc")
      );
      sandbox.replace(
        labkeyClient,
        "getImagingSessionIdsForBarcode",
        getImagingSessionIdsForBarcode || stub().resolves([null, 1])
      );
      sandbox.replace(
        mmsClient,
        "getPlate",
        getPlate ||
          stub().resolves({
            ...mockAuditInfo,
            barcode: "123456",
            comments: "",
            imagingSessionId: undefined,
            plateGeometryId: 1,
            plateId: 1,
            plateStatusId: 1,
            seededOn: "2018-02-14 23:03:52",
          })
      );
      sandbox.replace(
        mmsClient,
        "getTemplate",
        getTemplate || stub().resolves(mockMMSTemplate)
      );
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
          expandedUploadJobRows: {},
          imagingSessionId: undefined,
          imagingSessionIds: [],
          job: undefined,
          plate: {},
          selectedWells: [],
          selectedWorkflows: [],
          stagedFiles: [],
          wells: {},
        }),
        upload: getMockStateWithHistory({}),
      };
    });

    it("sets error alert if job passed in does not have fileId information", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(
        openEditFileMetadataTab({
          ...mockSuccessfulUploadJob,
          serviceFields: {
            ...mockSuccessfulUploadJob.serviceFields,
            result: undefined,
          },
        })
      );
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal("No fileIds found in selected Job.");
    });
    it("sets error alert if job passed is not succeeded", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(
        openEditFileMetadataTab({
          ...mockSuccessfulUploadJob,
          status: "FAILED",
        })
      );
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal(
        "Cannot update file metadata because upload has not succeeded"
      );
    });
    it("sets error alert if all files for the job have since been deleted", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      expect(getAlert(store.getState())).to.be.undefined;

      store.dispatch(
        openEditFileMetadataTab({
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
      expect(getAppliedTemplateId(state)).to.be.undefined;

      store.dispatch(openEditFileMetadataTab(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      state = store.getState();
      expect(getPage(state)).to.equal(Page.AddCustomData);
      expect(getView(state)).to.equal(Page.AddCustomData);
      expect(getFileMetadataForJob(state)).to.equal(fileMetadata);
      expect(getUpload(state)).to.deep.equal({
        [getUploadRowKey({ file: "/localFilePath" })]: {
          ...fileMetadata[0],
          barcode: undefined, // TODO
          channel: undefined,
          file: "/localFilePath",
          notes: undefined,
          wellIds: [100],
        },
      });
      expect(getAppliedTemplateId(state)).to.not.be.undefined;
    });
    it("sets uploadError given not OK response when getting file metadata", async () => {
      stubMethods({
        transformFileMetadataIntoTable: stub().rejects("error!"),
      });
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      expect(getUploadError(store.getState())).to.be.undefined;

      store.dispatch(openEditFileMetadataTab(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(getUploadError(store.getState())).to.not.be.undefined;
      expect(
        getRequestsInProgressContains(
          store.getState(),
          AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
        )
      ).to.be.false;
    });
    it("does not dispatch setPlate action file metadata does not contain well annotation", async () => {
      stubMethods({
        transformFileMetadataIntoTable: stub().resolves([
          {
            ...omit(fileMetadata, ["Well"]),
            Workflow: ["Pipeline 5"],
          },
        ]),
      });
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      store.dispatch(openEditFileMetadataTab(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(getSelectedPlate(store.getState())).to.be.undefined;
    });
    it("sets upload error if something goes wrong while trying to get and set plate info", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      store.dispatch(openEditFileMetadataTab(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      expect(getUploadError(store.getState())).to.not.be.undefined;
      expect(
        getRequestsInProgressContains(
          store.getState(),
          AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB
        )
      ).to.be.false;
    });
  });
});
