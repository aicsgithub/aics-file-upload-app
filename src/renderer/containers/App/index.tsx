import "@aics/aics-react-labkey/dist/styles.css";
import { message, Tabs } from "antd";
import { ipcRenderer, remote } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SAFELY_CLOSE_WINDOW } from "../../../shared/constants";

import FolderTree from "../../components/FolderTree";
import StatusBar from "../../components/StatusBar";
import { selection } from "../../state";
import { clearAlert, setAlert } from "../../state/feedback/actions";
import { getAlert, getIsLoading, getRecentEvent } from "../../state/feedback/selectors";
import {
    AlertType,
    AppAlert,
    AppEvent,
    ClearAlertAction,
    SetAlertAction,
} from "../../state/feedback/types";
import { getIsSafeToExit } from "../../state/job/selectors";
import { requestMetadata } from "../../state/metadata/actions";
import { RequestMetadataAction } from "../../state/metadata/types";
import { selectView } from "../../state/route/actions";
import { getPage, getView } from "../../state/route/selectors";
import { AppPageConfig, Page, SelectViewAction } from "../../state/route/types";
import {
    clearStagedFiles,
    loadFilesFromDragAndDrop,
    openFilesFromDialog,
} from "../../state/selection/actions";
import {
    getSelectedFiles,
    getStagedFiles,
} from "../../state/selection/selectors";
import {
    ClearStagedFilesAction,
    GetFilesInFolderAction,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
    SelectFileAction,
    UploadFile,
} from "../../state/selection/types";
import { gatherSettings, updateSettings } from "../../state/setting/actions";
import { getLimsUrl } from "../../state/setting/selectors";
import {
    GatherSettingsAction,
    UpdateSettingsAction,
} from "../../state/setting/types";
import { State } from "../../state/types";
import { FileTagType } from "../../state/upload/types";

import AddCustomData from "../AddCustomData";
import AssociateFiles from "../AssociateFiles";
import DragAndDropSquare from "../DragAndDropSquare";
import OpenTemplateModal from "../OpenTemplateModal";
import EnterBarcode from "../SelectUploadType";
import SettingsEditorModal from "../SettingsEditorModal";
import TemplateEditorModal from "../TemplateEditorModal";
import UploadSummary from "../UploadSummary";

import { getFileToTags } from "./selectors";

const styles = require("./styles.pcss");

const { TabPane } = Tabs;

const ALERT_DURATION = 2;

interface AppProps {
    alert?: AppAlert;
    clearAlert: ActionCreator<ClearAlertAction>;
    clearStagedFiles: ActionCreator<ClearStagedFilesAction>;
    copyInProgress: boolean;
    fileToTags: Map<string, FileTagType[]>;
    files: UploadFile[];
    gatherSettings: ActionCreator<GatherSettingsAction>;
    getFilesInFolder: ActionCreator<GetFilesInFolderAction>;
    limsUrl: string;
    loadFilesFromDragAndDrop: ActionCreator<LoadFilesFromDragAndDropAction>;
    openFilesFromDialog: ActionCreator<LoadFilesFromOpenDialogAction>;
    loading: boolean;
    recentEvent?: AppEvent;
    requestMetadata: ActionCreator<RequestMetadataAction>;
    selectFile: ActionCreator<SelectFileAction>;
    selectedFiles: string[];
    setAlert: ActionCreator<SetAlertAction>;
    selectView: ActionCreator<SelectViewAction>;
    page: Page;
    updateSettings: ActionCreator<UpdateSettingsAction>;
    view: Page;
}

const APP_PAGE_TO_CONFIG_MAP = new Map<Page, AppPageConfig>([
    [Page.DragAndDrop, {
        container: <DragAndDropSquare key="dragAndDrop" />,
    }],
    [Page.SelectUploadType, {
        container:  <EnterBarcode key="enterBarcode"/>,
    }],
    [Page.AssociateFiles, {
        container:  <AssociateFiles key="associateFiles"/>,
    }],
    [Page.AddCustomData, {
        container: <AddCustomData key="addCustomData"/>,
    }],
    [Page.UploadSummary, {
        container: <UploadSummary key="uploadSummary"/>,
    }],
]);

message.config({
    maxCount: 1,
});

class App extends React.Component<AppProps, {}> {
    public componentDidMount() {
        this.props.requestMetadata();
        this.props.gatherSettings();
        ipcRenderer.on(SAFELY_CLOSE_WINDOW, () => {
            const warning = "Uploads are in progress. Exiting now may cause incomplete uploads to be abandoned and" +
                " will need to be manually cancelled. Are you sure?";
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
            view,
        } = this.props;
        const pageConfig = APP_PAGE_TO_CONFIG_MAP.get(page);
        const uploadSummaryConfig = APP_PAGE_TO_CONFIG_MAP.get(Page.UploadSummary);

        if (!pageConfig || !uploadSummaryConfig) {
            return null;
        }

        return (
            <div className={styles.container}>
                <div className={styles.mainContentContainer}>
                    <FolderTree
                       className={styles.folderTree}
                       clearStagedFiles={this.props.clearStagedFiles}
                       files={files}
                       getFilesInFolder={getFilesInFolder}
                       isLoading={loading}
                       loadFilesFromDragAndDropAction={this.props.loadFilesFromDragAndDrop}
                       loadFilesFromOpenDialogAction={this.props.openFilesFromDialog}
                       onCheck={selectFile}
                       selectedKeys={selectedFiles}
                       setAlert={setAlert}
                       fileToTags={fileToTags}
                    />
                    <div className={styles.mainContent}>
                        <Tabs
                            activeKey={view}
                            className={styles.tabContainer}
                            onChange={this.props.selectView}
                            type="card"
                        >
                            <TabPane className={styles.tabContent} tab="Summary" key={Page.UploadSummary}>
                                {uploadSummaryConfig.container}
                            </TabPane>
                            {page !== Page.UploadSummary && (
                                <TabPane className={styles.tabContent} tab="Current Upload" key={page}>
                                    {pageConfig.container}
                                </TabPane>
                            )}
                        </Tabs>
                    </div>
                </div>
                <StatusBar className={styles.statusBar} event={recentEvent} limsUrl={limsUrl}/>
                <TemplateEditorModal/>
                <OpenTemplateModal/>
                <SettingsEditorModal/>
            </div>
        );
    }
}

function mapStateToProps(state: State) {
    return {
        alert: getAlert(state),
        copyInProgress: !getIsSafeToExit(state),
        fileToTags: getFileToTags(state),
        files: getStagedFiles(state),
        limsUrl: getLimsUrl(state),
        loading: getIsLoading(state),
        page: getPage(state),
        recentEvent: getRecentEvent(state),
        selectedFiles: getSelectedFiles(state),
        view: getView(state),
    };
}

const dispatchToPropsMap = {
    clearAlert,
    clearStagedFiles,
    gatherSettings,
    getFilesInFolder: selection.actions.getFilesInFolder,
    loadFilesFromDragAndDrop,
    openFilesFromDialog,
    requestMetadata,
    selectFile: selection.actions.selectFile,
    selectView,
    setAlert,
    updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(App);
