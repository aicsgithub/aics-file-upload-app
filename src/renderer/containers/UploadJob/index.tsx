import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { Button } from "antd";
import { ipcRenderer, OpenDialogOptions, remote } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_CREATE_SCHEMA_MODAL } from "../../../shared/constants";
import FormPage from "../../components/FormPage";
import UploadJobGrid from "../../components/UploadJobGrid";
import { setAlert } from "../../state/feedback/actions";
import { AlertType, SetAlertAction } from "../../state/feedback/types";
import { goBack, goForward } from "../../state/selection/actions";
import { GoBackAction, NextPageAction } from "../../state/selection/types";
import { addSchemaFilepath, removeSchemaFilepath } from "../../state/setting/actions";
import { getSchemaFileOptions } from "../../state/setting/selectors";
import {
    AddSchemaFilepathAction,
    ColumnDefinition,
    ColumnType,
    RemoveSchemaFilepathAction,
    SchemaDefinition
} from "../../state/setting/types";
import { State } from "../../state/types";
import {
    initiateUpload,
    jumpToUpload,
    removeUploads,
    updateSchema,
    updateUpload
} from "../../state/upload/actions";
import {
    getCanRedoUpload,
    getCanUndoUpload,
    getSchemaFile,
    getUploadSummaryRows
} from "../../state/upload/selectors";
import {
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    SchemaFileOption,
    UpdateSchemaAction,
    UpdateUploadAction,
    UploadJobTableRow,
} from "../../state/upload/types";
import { checkFileExistsAsync, readFileAsync } from "../../util";
import { isSchemaDefinition } from "../App/util";

const styles = require("./style.pcss");

interface Props {
    addSchemaFilepath: ActionCreator<AddSchemaFilepathAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    filepath?: string;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    removeSchemaFilepath: ActionCreator<RemoveSchemaFilepathAction>;
    schemaFile?: string;
    schemaFileOptions: SchemaFileOption[];
    setAlert: ActionCreator<SetAlertAction>;
    updateSchema: ActionCreator<UpdateSchemaAction>;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
}

interface UploadJobState {
    schema?: SchemaDefinition;
    selectedFiles: string[];
}

const openDialogOptions: OpenDialogOptions = {
    filters: [
        { name: "JSON", extensions: ["json"] },
    ],
    properties: ["openFile"],
    title: "Select JSON file",
};

const BROWSE_FOR_EXISTING_SCHEMA = "...Browse for existing schema";

class UploadJob extends React.Component<Props, UploadJobState> {
    private static openSchemaCreator() {
        ipcRenderer.send(OPEN_CREATE_SCHEMA_MODAL);
    }

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedFiles: [],
        };
    }

    public render() {
        return (
            <FormPage
                className={this.props.className}
                formTitle="ADD ADDITIONAL DATA"
                formPrompt="Review and add information to the files below and click Upload to submit the job."
                onSave={this.upload}
                saveButtonDisabled={!this.props.uploads.length || this.requiredValuesMissing()}
                saveButtonName="Upload"
                onBack={this.props.goBack}
            >
                {this.renderButtons()}
                <UploadJobGrid
                    canRedo={this.props.canRedo}
                    canUndo={this.props.canUndo}
                    redo={this.redo}
                    removeSchemaFilepath={this.props.removeSchemaFilepath}
                    removeUploads={this.props.removeUploads}
                    schema={this.state.schema}
                    setAlert={this.props.setAlert}
                    selectSchema={this.selectSchema}
                    schemaFile={this.props.schemaFile}
                    schemaFileOptions={this.props.schemaFileOptions}
                    undo={this.undo}
                    updateUpload={this.props.updateUpload}
                    uploads={this.props.uploads}
                />
            </FormPage>
        );
    }

    private renderButtons = () => {
        const {
            schemaFile,
            schemaFileOptions,
        } = this.props;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.applySchemaWidth}>
                    <LabKeyOptionSelector
                        label="Apply Schema"
                        optionIdKey="filepath"
                        optionNameKey="filepath"
                        selected={schemaFile ? { filepath: schemaFile } : undefined}
                        onOptionSelection={this.selectSchema}
                        options={schemaFileOptions}
                        placeholder="Select a schema file"
                    />
                </div>
                <Button className={styles.createSchemaButton} onClick={UploadJob.openSchemaCreator}>
                    Create Schema
                </Button>
            </div>
        );
    }

    private readFile = async (schemaFile: string, newFile?: boolean) => {
        try {
            const fileBuffer = await readFileAsync(schemaFile);
            const fileString = fileBuffer.toString();
            const schema = JSON.parse(fileString);
            if (!isSchemaDefinition(schema)) {
                this.props.updateSchema();
                this.handleError("Invalid schema JSON", schemaFile);
                return;
            }
            this.props.updateSchema(schema, schemaFile);
            if (newFile) {
                this.props.addSchemaFilepath(schemaFile);
            }
            this.setState({ schema });
        } catch (e) {
            // It is possible for a user to select a directory
            this.props.updateSchema();
            this.handleError("Invalid file or directory selected (.json only)", schemaFile);
        }
    }

    private findSchema = async () => {
        remote.dialog.showOpenDialog(openDialogOptions, async (filepaths?: string[]) => {
            if (filepaths && filepaths.length) {
                // This shouldn't be possible with current window config
                if (filepaths.length > 1) {
                    this.props.updateSchema();
                    this.handleError("Only one file may be selected");
                } else {
                    await this.readFile(filepaths[0], true);
                }
            }
        });
    }

    private selectSchema = async (option: SchemaFileOption | null) => {
        if (option && option.filepath !== this.props.schemaFile) {
            if (option.filepath === BROWSE_FOR_EXISTING_SCHEMA) {
                await this.findSchema();
            } else {
                const fileExists = await checkFileExistsAsync(option.filepath);
                if (!fileExists) {
                    this.props.updateSchema();
                    this.handleError(`File cannot be found ${option.filepath}.`, option.filepath);
                    return;
                }
                await this.readFile(option.filepath);
            }
        } else {
            this.props.updateSchema();
            this.setState({ schema: undefined });
        }
    }

    private upload = (): void => {
        this.props.initiateUpload();
        this.props.goForward();
    }

    private requiredValuesMissing = (): boolean => {
        const {schema} = this.state;
        if (schema) {
            return !schema.columns.every(({label, type: { type }, required}: ColumnDefinition) => {
                if (required && type !== ColumnType.BOOLEAN) {
                    return this.props.uploads.every((upload: UploadJobTableRow) => {
                        return Boolean(upload[label]);
                    });
                }
                return true;
            });
        }
        return false;
    }

    private handleError = (error: string, errorFile?: string) => {
        if (errorFile) {
            this.props.removeSchemaFilepath(errorFile);
        }
        this.props.setAlert({
            message: error,
            type: AlertType.WARN,
        });
    }

    private undo = (): void => {
        this.props.jumpToUpload(-1);
    }

    private redo = (): void => {
        this.props.jumpToUpload(1);
    }
}

function mapStateToProps(state: State) {
    return {
        canRedo: getCanRedoUpload(state),
        canUndo: getCanUndoUpload(state),
        schemaFile: getSchemaFile(state),
        schemaFileOptions: getSchemaFileOptions(state),
        uploads: getUploadSummaryRows(state),
    };
}

const dispatchToPropsMap = {
    addSchemaFilepath,
    goBack,
    goForward,
    initiateUpload,
    jumpToUpload,
    removeSchemaFilepath,
    removeUploads,
    setAlert,
    updateSchema,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(UploadJob);
