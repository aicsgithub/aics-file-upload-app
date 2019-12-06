import { Checkbox, Icon, Switch, Typography } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { map } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import { goBack, goForward } from "../../state/route/actions";
import { GoBackAction, NextPageAction, Page } from "../../state/route/types";
import { State } from "../../state/types";
import { updateFilesToArchive, updateFilesToStoreOnIsilon } from "../../state/upload/actions";
import {
    getCanGoForwardFromSelectStorageLocationPage,
    getFileToArchive,
    getFileToStoreOnIsilon,
    getUploadFiles,
} from "../../state/upload/selectors";
import { FilepathToBoolean, UpdateFilesToArchive, UpdateFilesToStoreOnIsilon } from "../../state/upload/types";

const styles = require("./styles.pcss");
const { Text } = Typography;

interface Props {
    canGoForward: boolean;
    className?: string;
    fileToArchive: FilepathToBoolean;
    fileToStoreOnIsilon: FilepathToBoolean;
    files: string[];
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    updateFilesToArchive: ActionCreator<UpdateFilesToArchive>;
    updateFilesToStoreOnIsilon: ActionCreator<UpdateFilesToStoreOnIsilon>;
}

interface SelectStorageIntentState {
    customizeByFile: boolean;
}

class SelectStorageIntent extends React.Component<Props, SelectStorageIntentState> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            customizeByFile: false,
        };
    }

    public render() {
        const { canGoForward, files } = this.props;
        const { customizeByFile } = this.state;
        const moreThanOneFile = files.length > 1;
        return (
            <FormPage
                formPrompt={`Where should ${moreThanOneFile ? "these files" : "this file"} be stored?`}
                formTitle="SELECT STORAGE LOCATIONS"
                onBack={this.props.goBack}
                onSave={this.props.goForward}
                page={Page.SelectStorageLocation}
                saveButtonDisabled={!canGoForward}
            >
                {moreThanOneFile && <div className={styles.switchRow}>
                    <Switch
                        checked={customizeByFile}
                        className={styles.switch}
                        onChange={this.setCustomizeByFile}
                    />
                    <span className={styles.switchLabel}>Customize by File</span>
                </div>}
                {!customizeByFile && this.renderSimpleForm()}
                {customizeByFile && this.renderGridForm()}
            </FormPage>
        );
    }

    public renderSimpleForm = () => {
        const {
            fileToArchive,
            fileToStoreOnIsilon,
            files,
        } = this.props;
        const allFilesShouldBeInIsilon = map(fileToStoreOnIsilon, (store: boolean) => store)
            .filter((store) => Boolean(store)).length === files.length;
        const allFilesShouldBeInArchive = map(fileToArchive, (store: boolean) => store)
            .filter((store) => Boolean(store)).length === files.length;
        return (
            <>
                <Checkbox
                    checked={allFilesShouldBeInArchive}
                    className={styles.selectAllCheckbox}
                    onChange={this.selectAllArchive}
                >
                    Archive <Text type="secondary">(File will be backed up but not downloadable)</Text>
                </Checkbox>
                <Checkbox
                    checked={allFilesShouldBeInIsilon}
                    className={styles.selectAllCheckbox}
                    onChange={this.selectAllIsilon}
                >
                    Isilon <Text type="secondary">(Necessary if this file will be downloaded again)</Text>
                </Checkbox>
            </>
        );
    }

    public renderGridForm = () => {
        const {
            fileToArchive,
            fileToStoreOnIsilon,
            files,
        } = this.props;
        return files.map((f: string) => (
                <div className={styles.fileRow} key={f}>
                    <div className={styles.file}>
                        <Icon className={styles.icon} type="file"/>
                        {f}
                    </div>
                    <div className={styles.checkboxes}>
                        <Checkbox
                            checked={fileToArchive[f]}
                            onChange={this.onArchiveChange(f)}
                        >
                            Archive
                        </Checkbox>
                        <Checkbox
                            checked={fileToStoreOnIsilon[f]}
                            onChange={this.onStoreOnIsilonChange(f)}
                        >
                            Isilon
                        </Checkbox>
                    </div>
                </div>
            )
        );
    }

    public setCustomizeByFile = (checked: boolean) => this.setState({customizeByFile: checked});

    public selectAllIsilon = (e: CheckboxChangeEvent) => {
        this.props.updateFilesToStoreOnIsilon(
            this.props.files
                .reduce((accum: FilepathToBoolean, file: string) => ({
                    ...accum,
                    [file]: e.target.checked,
                }), {})
        );
    }

    public selectAllArchive = (e: CheckboxChangeEvent) => {
        this.props.updateFilesToArchive(
            this.props.files
                .reduce((accum: FilepathToBoolean, file: string) => ({
                    ...accum,
                    [file]: e.target.checked,
                }), {})
        );
    }

    public onStoreOnIsilonChange = (file: string) => (e: CheckboxChangeEvent) =>
        this.props.updateFilesToStoreOnIsilon({[file]: e.target.checked})

    public onArchiveChange = (file: string) => (e: CheckboxChangeEvent) =>
        this.props.updateFilesToArchive({[file]: e.target.checked})
}

function mapStateToProps(state: State) {
    return {
        canGoForward: getCanGoForwardFromSelectStorageLocationPage(state),
        fileToArchive: getFileToArchive(state),
        fileToStoreOnIsilon: getFileToStoreOnIsilon(state),
        files: getUploadFiles(state),
    };
}

const dispatchToPropsMap = {
    goBack,
    goForward,
    updateFilesToArchive,
    updateFilesToStoreOnIsilon,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SelectStorageIntent);
