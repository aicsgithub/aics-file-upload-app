import { Button, Checkbox } from "antd";
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
import { getFileToArchive, getFileToStoreOnIsilon, getUploadFiles } from "../../state/upload/selectors";
import { FilepathToBoolean, UpdateFilesToArchive, UpdateFilesToStoreOnIsilon } from "../../state/upload/types";

const styles = require("./styles.pcss");

interface SelectStorageIntentProps {
    className?: string;
    fileToArchive: FilepathToBoolean;
    fileToStoreOnIsilon: FilepathToBoolean;
    files: string[];
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    updateFilesToArchive: ActionCreator<UpdateFilesToArchive>;
    updateFilesToStoreOnIsilon: ActionCreator<UpdateFilesToStoreOnIsilon>;
}

class SelectStorageIntent extends React.Component<SelectStorageIntentProps, {}> {
    public render() {
        return (
            <FormPage
                formPrompt={`Choose where to store each file. Select Isilon if this file needs to be downloaded again.
                Select Archive if you would like to back up this file.`}
                formTitle="SELECT STORAGE LOCATIONS"
                onBack={this.props.goBack}
                onSave={this.props.goForward}
                page={Page.SelectStorageLocation}
                saveButtonDisabled={false} // todo
            >
                {this.renderSimpleForm()}
            </FormPage>
        );
    }

    public renderSimpleForm() {
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
                    checked={allFilesShouldBeInIsilon}
                    className={styles.selectAllCheckbox}
                    onChange={this.selectAllIsilon}
                >
                    Isilon
                </Checkbox>
                <Checkbox
                    checked={allFilesShouldBeInArchive}
                    className={styles.selectAllCheckbox}
                    onChange={this.selectAllArchive}
                >
                    Archive
                </Checkbox>
                <Button type="link">Customize</Button>
            </>
        );
    }

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
}

function mapStateToProps(state: State) {
    return {
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
