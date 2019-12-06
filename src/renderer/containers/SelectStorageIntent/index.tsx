import { Button, Checkbox } from "antd";
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
               page={Page.SelectStorageLocation}
           >
               {this.renderSimpleForm()}
           </FormPage>
       );
    }

    public renderSimpleForm() {
        return (
            <>
                <Checkbox className={styles.selectAllCheckbox} onChange={this.selectAllIsilon}>Isilon</Checkbox>
                <Checkbox className={styles.selectAllCheckbox} onChange={this.selectAllArchive}>Archive</Checkbox>
                <Button type="link">Customize</Button>
            </>
        );
    }

    public selectAllIsilon() {
        this.props.updateFilesToStoreOnIsilon(
            this.props.files
                .reduce((accum: FilepathToBoolean, file: string) => ({
                    ...accum,
                    [file]: true,
                }), {})
        );
    }

    public selectAllArchive() {
        this.props.updateFilesToArchive(
            this.props.files
                .reduce((accum: FilepathToBoolean, file: string) => ({
                    ...accum,
                    [file]: true,
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
