import "@aics/aics-react-labkey/dist/styles.css";
import { message, Tabs } from "antd";
import { ipcRenderer, remote } from "electron";
import { readFile } from "fs";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { OPEN_CREATE_SCHEMA_MODAL, SAFELY_CLOSE_WINDOW, SET_LIMS_URL } from "../../../shared/constants";
import { LimsUrl } from "../../../shared/types";

import FolderTree from "../../components/FolderTree";
import SchemaEditorModal from "../../components/SchemaEditorModal";
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
import { getDatabaseMetadata } from "../../state/metadata/selectors";
import { DatabaseMetadata, RequestMetadataAction } from "../../state/metadata/types";
import { closeSchemaCreator, openSchemaCreator, selectView } from "../../state/selection/actions";
import {
    getPage,
    getSelectedFiles,
    getShowCreateSchemaModal,
    getStagedFiles,
    getView,
} from "../../state/selection/selectors";
import {
    AppPageConfig,
    CloseSchemaCreatorAction,
    GetFilesInFolderAction,
    OpenSchemaCreatorAction,
    Page,
    SelectFileAction,
    SelectViewAction,
    UploadFile
} from "../../state/selection/types";
import { addSchemaFilepath, gatherSettings, updateSettings } from "../../state/setting/actions";
import { getLimsUrl } from "../../state/setting/selectors";
import {
    AddSchemaFilepathAction,
    GatherSettingsAction,
    SchemaDefinition,
    UpdateSettingsAction,
} from "../../state/setting/types";
import { State } from "../../state/types";
import { FileTagType } from "../../state/upload/types";

import AssociateFiles from "../AssociateFiles";
import DragAndDropSquare from "../DragAndDropSquare";
import EnterBarcode from "../EnterBarcode";
import UploadJobs from "../UploadJob";
import UploadSummary from "../UploadSummary";

import { getFileToTags } from "./selectors";
import { isSchemaDefinition } from "./util";

const styles = require("./styles.pcss");

const { TabPane } = Tabs;

const ALERT_DURATION = 2;

interface AppProps {
    addSchemaFilepath: ActionCreator<AddSchemaFilepathAction>;
    alert?: AppAlert;
    clearAlert: ActionCreator<ClearAlertAction>;
    closeSchemaCreator: ActionCreator<CloseSchemaCreatorAction>;
    copyInProgress: boolean;
    fileToTags: Map<string, FileTagType[]>;
    files: UploadFile[];
    gatherSettings: ActionCreator<GatherSettingsAction>;
    getFilesInFolder: ActionCreator<GetFilesInFolderAction>;
    limsUrl: string;
    loading: boolean;
    openSchemaCreator: ActionCreator<OpenSchemaCreatorAction>;
    recentEvent?: AppEvent;
    requestMetadata: ActionCreator<RequestMetadataAction>;
    selectFile: ActionCreator<SelectFileAction>;
    selectedFiles: string[];
    setAlert: ActionCreator<SetAlertAction>;
    selectView: ActionCreator<SelectViewAction>;
    showCreateSchemaModal: boolean;
    page: Page;
    tables?: DatabaseMetadata;
    updateSettings: ActionCreator<UpdateSettingsAction>;
    view: Page;
}

interface AppState {
    schema?: SchemaDefinition;
    schemaFilepath?: string;
}

const APP_PAGE_TO_CONFIG_MAP = new Map<Page, AppPageConfig>([
    [Page.DragAndDrop, {
        container: <DragAndDropSquare key="dragAndDrop"/>,
        folderTreeVisible: false,
    }],
    [Page.EnterBarcode, {
        container:  <EnterBarcode key="enterBarcode" className={styles.mainContent}/>,
        folderTreeVisible: true,
    }],
    [Page.AssociateFiles, {
        container:  <AssociateFiles key="associateFiles" className={styles.mainContent}/>,
        folderTreeVisible: true,
    }],
    [Page.UploadJobs, {
        container: <UploadJobs key="uploadJobs" className={styles.mainContent}/>,
        folderTreeVisible: true,
    }],
    [Page.UploadSummary, {
        container: <UploadSummary key="uploadSummary" className={styles.mainContent}/>,
        folderTreeVisible: false,
    }],
]);

message.config({
    maxCount: 1,
});

class App extends React.Component<AppProps, AppState> {
    public state: AppState = {
    };

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
        ipcRenderer.on(OPEN_CREATE_SCHEMA_MODAL, (event: Event, schemaFilepath?: string) => {
            if (schemaFilepath) {
                readFile(schemaFilepath, (err, data: Buffer) => {
                    if (err) {
                        this.props.setAlert({
                            message: err,
                            type: AlertType.ERROR,
                        });
                    } else {
                        try {
                            const json = JSON.parse(data.toString());
                            if (isSchemaDefinition(json)) {
                                this.setState({
                                    schema: json,
                                    schemaFilepath,
                                });
                                this.props.openSchemaCreator();
                            } else {
                                this.props.setAlert({
                                    message: "Invalid schema JSON",
                                    type: AlertType.ERROR,
                                });
                            }

                        } catch (e) {
                            this.props.setAlert({
                                message: e.message || "File is not valid JSON",
                                type: AlertType.ERROR,
                            });
                        }
                    }
                });
            } else {
                this.props.openSchemaCreator();
            }
        });

    }

    public componentDidUpdate(prevProps: AppProps) {
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
            showCreateSchemaModal,
            page,
            tables,
            view,
        } = this.props;
        const { schema, schemaFilepath } = this.state;
        const pageConfig = APP_PAGE_TO_CONFIG_MAP.get(page);
        const uploadSummaryConfig = APP_PAGE_TO_CONFIG_MAP.get(Page.UploadSummary);

        if (!pageConfig || !uploadSummaryConfig) {
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
                           onCheck={selectFile}
                           selectedKeys={selectedFiles}
                           setAlert={setAlert}
                           fileToTags={fileToTags}
                       />
                    }
                    <div className={styles.tabContainer}>
                        <Tabs activeKey={view} onChange={this.props.selectView}>
                            <TabPane tab="Summary" key={Page.UploadSummary}>
                                {uploadSummaryConfig.container}
                            </TabPane>
                            {page !== Page.UploadSummary && <TabPane tab="Current Job" key={page}>
                                {pageConfig.container}
                            </TabPane>}
                        </Tabs>
                    </div>
                </div>
                <StatusBar className={styles.statusBar} event={recentEvent} limsUrl={limsUrl}/>
                <SchemaEditorModal
                    close={this.props.closeSchemaCreator}
                    onSchemaFileCreated={this.props.addSchemaFilepath}
                    visible={showCreateSchemaModal}
                    schema={schema}
                    setAlert={setAlert}
                    filepath={schemaFilepath}
                    tables={tables}
                />
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
        showCreateSchemaModal: getShowCreateSchemaModal(state),
        tables: getDatabaseMetadata(state),
        view: getView(state),
    };
}

const dispatchToPropsMap = {
    addSchemaFilepath,
    clearAlert,
    closeSchemaCreator,
    gatherSettings,
    getFilesInFolder: selection.actions.getFilesInFolder,
    openSchemaCreator,
    requestMetadata,
    selectFile: selection.actions.selectFile,
    selectView,
    setAlert,
    updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(App);
