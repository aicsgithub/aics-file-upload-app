import "@aics/aics-react-labkey/dist/styles.css";
import { message } from "antd";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { SAFELY_CLOSE_WINDOW, SET_LIMS_URL } from "../../../shared/constants";
import { LimsUrl } from "../../../shared/types";

import FolderTree from "../../components/FolderTree";
import StatusBar from "../../components/StatusBar";
import { selection } from "../../state";
import { clearAlert } from "../../state/feedback/actions";
import { getAlert, getIsLoading, getRecentEvent, getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AlertType, AppAlert, AppEvent, AsyncRequest, ClearAlertAction } from "../../state/feedback/types";
import { requestMetadata } from "../../state/metadata/actions";
import { RequestMetadataAction } from "../../state/metadata/types";
import { getPage, getSelectedFiles, getStagedFiles } from "../../state/selection/selectors";
import {
    AppPageConfig,
    GetFilesInFolderAction,
    Page,
    SelectFileAction,
    UploadFile,
} from "../../state/selection/types";
import { gatherSettings, updateSettings } from "../../state/setting/actions";
import { getLimsUrl } from "../../state/setting/selectors";
import { GatherSettingsAction, UpdateSettingsAction } from "../../state/setting/types";
import { State } from "../../state/types";
import { FileTag } from "../../state/upload/types";

import AssociateWells from "../AssociateWells";
import DragAndDropSquare from "../DragAndDropSquare";
import EnterBarcode from "../EnterBarcode";
import UploadJobs from "../UploadJob";
import UploadSummary from "../UploadSummary";

import { getFileToTags } from "./selectors";
const styles = require("./styles.pcss");
const ALERT_DURATION = 2;

interface AppProps {
    alert?: AppAlert;
    clearAlert: ActionCreator<ClearAlertAction>;
    copyInProgress: boolean;
    fileToTags: Map<string, FileTag[]>;
    files: UploadFile[];
    gatherSettings: ActionCreator<GatherSettingsAction>;
    getFilesInFolder: ActionCreator<GetFilesInFolderAction>;
    limsUrl: string;
    loading: boolean;
    recentEvent?: AppEvent;
    requestMetadata: ActionCreator<RequestMetadataAction>;
    selectFile: ActionCreator<SelectFileAction>;
    selectedFiles: string[];
    page: Page;
    updateSettings: ActionCreator<UpdateSettingsAction>;
}

const APP_PAGE_TO_CONFIG_MAP = new Map<Page, AppPageConfig>([
    [Page.DragAndDrop, {
        container: <DragAndDropSquare key="dragAndDrop"/>,
        folderTreeSelectable: false,
        folderTreeVisible: false,
    }],
    [Page.EnterBarcode, {
        container:  <EnterBarcode key="enterBarcode" className={styles.mainContent}/>,
        folderTreeSelectable: false,
        folderTreeVisible: true,
    }],
    [Page.AssociateWells, {
        container:  <AssociateWells key="associateWells" className={styles.mainContent}/>,
        folderTreeSelectable: true,
        folderTreeVisible: true,
    }],
    [Page.UploadJobs, {
        container: <UploadJobs key="uploadJobs" className={styles.mainContent}/>,
        folderTreeSelectable: false,
        folderTreeVisible: true,
    }],
    [Page.UploadSummary, {
        container: <UploadSummary key="uploadSummary" className={styles.mainContent}/>,
        folderTreeSelectable: false,
        folderTreeVisible: false,
    }],
]);

message.config({
    maxCount: 1,
});

class App extends React.Component<AppProps, {}> {
    public componentDidMount() {
        this.props.requestMetadata();
        this.props.gatherSettings();
        ipcRenderer.on(SET_LIMS_URL, (event: Event, limsUrl: LimsUrl) => {
            this.props.updateSettings(limsUrl);
        });
        ipcRenderer.on(SAFELY_CLOSE_WINDOW, () => {
            const warning = "Uploads are in progress. Exiting now will cause incomplete uploads to fail. Are you sure?";
            if (this.props.copyInProgress) {
                remote.dialog.showMessageBox({
                    buttons: ["Cancel", "Close Anyways"],
                    message: warning,
                    title: "Danger!",
                    type: "warning",
                }, (response: number) => {
                    if (response === 1) {
                        remote.app.exit();
                    }
                });
            } else {
                remote.app.exit();
            }
        });
    }

    public componentDidUpdate() {
        const { alert, clearAlert: dispatchClearAlert } = this.props;
        if (alert) {
            const { message: alertText, manualClear, type} = alert;
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

            dispatchClearAlert();
        }
    }

    public render() {
        const {
            fileToTags,
            files,
            getFilesInFolder,
            limsUrl,
            loading,
            recentEvent,
            selectFile,
            selectedFiles,
            page,
        } = this.props;

        const pageConfig = APP_PAGE_TO_CONFIG_MAP.get(page);

        if (!pageConfig) {
            return null;
        }

        return (
            <div className={styles.container}>
                <div className={styles.mainContentContainer}>
                    {pageConfig.folderTreeVisible &&
                       <FolderTree
                           className={styles.folderTree}
                           files={files}
                           getFilesInFolder={getFilesInFolder}
                           isLoading={loading}
                           isSelectable={pageConfig.folderTreeSelectable}
                           onCheck={selectFile}
                           selectedKeys={selectedFiles}
                           fileToTags={fileToTags}
                       />
                    }
                    {pageConfig.container}
                </div>
                <StatusBar className={styles.statusBar} event={recentEvent} limsUrl={limsUrl}/>
            </div>
        );
    }
}

function mapStateToProps(state: State) {
    return {
        alert: getAlert(state),
        copyInProgress: getRequestsInProgressContains(state, AsyncRequest.COPY_FILES),
        fileToTags: getFileToTags(state),
        files: getStagedFiles(state),
        limsUrl: getLimsUrl(state),
        loading: getIsLoading(state),
        page: getPage(state),
        recentEvent: getRecentEvent(state),
        selectedFiles: getSelectedFiles(state),
    };
}

const dispatchToPropsMap = {
    clearAlert,
    gatherSettings,
    getFilesInFolder: selection.actions.getFilesInFolder,
    requestMetadata,
    selectFile: selection.actions.selectFile,
    updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(App);
