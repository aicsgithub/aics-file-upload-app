import "@aics/aics-react-labkey/dist/styles.css";
import { message, notification, Tabs } from "antd";
import * as classNames from "classnames";
import { ipcRenderer, remote } from "electron";
import { camelizeKeys } from "humps";
import * as React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED,
  SAFELY_CLOSE_WINDOW,
  SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED,
  SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED,
} from "../../../shared/constants";
import FolderTree from "../../components/FolderTree";
import StatusBar from "../../components/StatusBar";
import { BaseServiceFields } from "../../services/aicsfiles/types";
import { JSSJob } from "../../services/job-status-client/types";
import {
  addRequestToInProgress,
  clearAlert,
  removeRequestFromInProgress,
  setAlert,
  setErrorAlert,
  setSuccessAlert,
  toggleFolderTree,
} from "../../state/feedback/actions";
import {
  getAlert,
  getFolderTreeOpen,
  getIsLoading,
  getRecentEvent,
  getSetMountPointNotificationVisible,
} from "../../state/feedback/selectors";
import {
  receiveJobInsert,
  receiveJobs,
  receiveJobUpdate,
} from "../../state/job/actions";
import { getIsSafeToExit } from "../../state/job/selectors";
import { requestMetadata } from "../../state/metadata/actions";
import { closeUploadTab, selectView } from "../../state/route/actions";
import { getPage, getView } from "../../state/route/selectors";
import { AppPageConfig } from "../../state/route/types";
import {
  clearStagedFiles,
  getFilesInFolder,
  loadFilesFromDragAndDrop,
  openFilesFromDialog,
  selectFile,
} from "../../state/selection/actions";
import {
  getSelectedFiles,
  getStagedFiles,
} from "../../state/selection/selectors";
import {
  gatherSettings,
  setMountPoint,
  switchEnvironment,
} from "../../state/setting/actions";
import { getLimsUrl, getLoggedInUser } from "../../state/setting/selectors";
import { AlertType, AsyncRequest, Page } from "../../state/types";
import {
  openUploadDraft,
  saveUploadDraft,
  undoFileWellAssociation,
  undoFileWorkflowAssociation,
} from "../../state/upload/actions";
import AddCustomData from "../AddCustomData";
import AssociateFiles from "../AssociateFiles";
import DragAndDropSquare from "../DragAndDropSquare";
import NotificationViewer from "../NotificationViewer";
import OpenTemplateModal from "../OpenTemplateModal";
import EnterBarcode from "../SelectUploadType";
import SettingsEditorModal from "../SettingsEditorModal";
import TemplateEditorModal from "../TemplateEditorModal";
import UploadSummary from "../UploadSummary";

import AutoReconnectingEventSource from "./AutoReconnectingEventSource";
import { getFileToTags, getUploadTabName } from "./selectors";

const styles = require("./styles.pcss");

const { TabPane } = Tabs;

const ALERT_DURATION = 2;

const APP_PAGE_TO_CONFIG_MAP = new Map<Page, AppPageConfig>([
  [
    Page.DragAndDrop,
    {
      container: <DragAndDropSquare key="dragAndDrop" />,
    },
  ],
  [
    Page.SelectUploadType,
    {
      container: <EnterBarcode key="enterBarcode" />,
    },
  ],
  [
    Page.AssociateFiles,
    {
      container: <AssociateFiles key="associateFiles" />,
    },
  ],
  [
    Page.AddCustomData,
    {
      container: <AddCustomData key="addCustomData" />,
    },
  ],
  [
    Page.UploadSummary,
    {
      container: <UploadSummary key="uploadSummary" />,
    },
  ],
]);

message.config({
  maxCount: 1,
});

export default function App() {
  const dispatch = useDispatch();

  const alert = useSelector(getAlert);
  const copyInProgress = !useSelector(getIsSafeToExit);
  const fileToTags = useSelector(getFileToTags);
  const files = useSelector(getStagedFiles);
  const folderTreeOpen = useSelector(getFolderTreeOpen);
  const limsUrl = useSelector(getLimsUrl);
  const user = useSelector(getLoggedInUser);
  const loading = useSelector(getIsLoading);
  const page = useSelector(getPage);
  const recentEvent = useSelector(getRecentEvent);
  const selectedFiles = useSelector(getSelectedFiles);
  const setMountPointNotificationVisible = useSelector(
    getSetMountPointNotificationVisible
  );
  const uploadTabName = useSelector(getUploadTabName);
  const view = useSelector(getView);

  // Request initial data
  useEffect(() => {
    dispatch(requestMetadata());
    dispatch(gatherSettings());
  }, [dispatch]);

  // Subscribe to job changes for current `limsUrl` and `user`
  useEffect(() => {
    dispatch(addRequestToInProgress(AsyncRequest.GET_JOBS));
    const eventSource = new AutoReconnectingEventSource(
      `${limsUrl}/jss/1.0/job/subscribe/${user}`,
      { withCredentials: true }
    );

    eventSource.addEventListener("initialJobs", (event: MessageEvent) => {
      dispatch(removeRequestFromInProgress(AsyncRequest.GET_JOBS));
      const jobs = camelizeKeys(JSON.parse(event.data)) as JSSJob<
        BaseServiceFields
      >[];
      const uploadJobs = jobs.filter(
        (job) => job.serviceFields?.type === "upload"
      );
      dispatch(receiveJobs(uploadJobs));
    });

    eventSource.addEventListener("jobInsert", (event: MessageEvent) => {
      const jobChange = camelizeKeys(JSON.parse(event.data)) as JSSJob<
        BaseServiceFields
      >;
      dispatch(receiveJobInsert(jobChange));
    });

    eventSource.addEventListener("jobUpdate", (event: MessageEvent) => {
      const jobChange = camelizeKeys(JSON.parse(event.data)) as JSSJob<
        BaseServiceFields
      >;
      dispatch(receiveJobUpdate(jobChange));
    });

    eventSource.onDisconnect(() =>
      dispatch(
        setErrorAlert(
          "Lost connection to the server, attempting to reconnect..."
        )
      )
    );

    eventSource.onReconnect(() =>
      dispatch(setSuccessAlert("Reconnected successfully!"))
    );

    return function cleanUp() {
      eventSource.close();
    };
  }, [limsUrl, user, dispatch]);

  // Event handlers for menu events
  useEffect(() => {
    ipcRenderer.on(SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED, () =>
      dispatch(switchEnvironment())
    );
    ipcRenderer.on(SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED, () =>
      dispatch(saveUploadDraft(true))
    );
    ipcRenderer.on(OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED, () =>
      dispatch(openUploadDraft())
    );

    return function cleanUp() {
      ipcRenderer.removeAllListeners(SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED);
      ipcRenderer.removeAllListeners(SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED);
      ipcRenderer.removeAllListeners(OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED);
    };
  }, [dispatch]);

  // This one needs a special event handler that will be recreated whenever
  // `copyInProgress` changes, since it is reliant on that value.
  useEffect(() => {
    ipcRenderer.on(SAFELY_CLOSE_WINDOW, () => {
      const warning =
        "Uploads are in progress. Exiting now may cause incomplete uploads to be abandoned and" +
        " will need to be manually cancelled. Are you sure?";
      if (copyInProgress) {
        remote.dialog
          .showMessageBox({
            buttons: ["Cancel", "Close Anyways"],
            message: warning,
            title: "Danger!",
            type: "warning",
          })
          .then((value: Electron.MessageBoxReturnValue) => {
            // value.response corresponds to button index
            if (value.response === 1) {
              remote.app.exit();
            }
          });
      } else {
        remote.app.exit();
      }
    });

    return function cleanUp() {
      ipcRenderer.removeAllListeners(SAFELY_CLOSE_WINDOW);
    };
  }, [copyInProgress, dispatch]);

  useEffect(() => {
    if (alert) {
      const { message: alertText, manualClear, type } = alert;
      const alertBody = <div>{alertText}</div>;
      const duration = manualClear ? 0 : ALERT_DURATION;

      switch (type) {
        case AlertType.WARN:
          message.warn(alertBody, duration);
          break;
        case AlertType.SUCCESS:
          message.success(alertBody, duration);
          break;
        case AlertType.ERROR:
          message.error(alertBody, duration);
          break;
        default:
          message.info(alertBody, duration);
          break;
      }

      dispatch(clearAlert());
    }
  }, [alert, dispatch]);

  useEffect(() => {
    if (setMountPointNotificationVisible) {
      notification.open({
        description:
          "Click this notification to manually set the allen mount point",
        duration: 0,
        message: "Could not find allen mount point (/allen/aics).",
        onClick: () => {
          notification.destroy();
          dispatch(setMountPoint());
        },
      });
    }
  }, [setMountPointNotificationVisible, dispatch]);

  const pageConfig = APP_PAGE_TO_CONFIG_MAP.get(page);
  const uploadSummaryConfig = APP_PAGE_TO_CONFIG_MAP.get(Page.UploadSummary);

  if (!pageConfig || !uploadSummaryConfig) {
    return null;
  }

  function onTabChange(
    targetKey: string | React.MouseEvent<HTMLElement>,
    action: "add" | "remove"
  ): void {
    // Currently only one tab is closable, so we are not checking targetKey. If
    // this changes, we'll need to add a check here.
    if (action === "remove") {
      dispatch(closeUploadTab());
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.mainContentContainer}>
        <FolderTree
          className={styles.folderTree}
          clearStagedFiles={() => dispatch(clearStagedFiles())}
          files={files}
          folderTreeOpen={folderTreeOpen}
          getFilesInFolder={(folder) => dispatch(getFilesInFolder(folder))}
          isLoading={loading}
          loadFilesFromDragAndDropAction={(files) =>
            dispatch(loadFilesFromDragAndDrop(files))
          }
          loadFilesFromOpenDialogAction={(files) =>
            dispatch(openFilesFromDialog(files))
          }
          onCheck={(files) => dispatch(selectFile(files))}
          selectedKeys={selectedFiles}
          setAlert={setAlert}
          fileToTags={fileToTags}
          toggleFolderTree={() => dispatch(toggleFolderTree())}
          undoFileWellAssociation={(rowId, deleteUpload, wellIds) =>
            dispatch(undoFileWellAssociation(rowId, deleteUpload, wellIds))
          }
          undoFileWorkflowAssociation={(fullPath, workflowNames) =>
            dispatch(undoFileWorkflowAssociation(fullPath, workflowNames))
          }
        />
        <div className={styles.mainContent}>
          <Tabs
            activeKey={view}
            className={styles.tabContainer}
            hideAdd={true}
            onChange={(view) => dispatch(selectView(view as Page))}
            onEdit={onTabChange}
            type="editable-card"
            tabBarExtraContent={
              <div style={{ marginRight: "10px" }}>
                <NotificationViewer />
              </div>
            }
          >
            <TabPane
              className={styles.tabContent}
              tab="Summary"
              key={Page.UploadSummary}
              closable={false}
            >
              {uploadSummaryConfig.container}
            </TabPane>
            {page !== Page.UploadSummary && (
              <TabPane
                className={classNames(styles.uploadTab, styles.tabContent)}
                tab={uploadTabName}
                key={page}
                closable={true}
              >
                {pageConfig.container}
              </TabPane>
            )}
          </Tabs>
        </div>
      </div>
      <StatusBar
        className={styles.statusBar}
        event={recentEvent}
        limsUrl={limsUrl}
      />
      <TemplateEditorModal />
      <OpenTemplateModal />
      <SettingsEditorModal />
    </div>
  );
}
