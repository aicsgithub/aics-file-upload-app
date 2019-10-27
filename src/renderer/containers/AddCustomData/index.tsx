import { Button, Select } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import FormPage from "../../components/FormPage";
import { setAlert } from "../../state/feedback/actions";
import { SetAlertAction } from "../../state/feedback/types";
import { requestTemplates } from "../../state/metadata/actions";
import { getTemplates } from "../../state/metadata/selectors";
import { GetTemplatesAction } from "../../state/metadata/types";
import { goBack, goForward, openTemplateEditor } from "../../state/selection/actions";
import { GoBackAction, NextPageAction, OpenTemplateEditorAction } from "../../state/selection/types";
import { removeTemplateIdFromSettings } from "../../state/setting/actions";
import { getTemplateIds } from "../../state/setting/selectors";
import {
    RemoveTemplateIdFromSettingsAction,
} from "../../state/setting/types";
import { getTemplateDraft } from "../../state/template/selectors";
import { AnnotationDraft, ColumnType, TemplateDraft } from "../../state/template/types";
import { State } from "../../state/types";
import {
    applyTemplate,
    initiateUpload,
    jumpToUpload,
    removeUploads,
    updateUpload
} from "../../state/upload/actions";
import {
    getAppliedTemplateId,
    getCanRedoUpload,
    getCanUndoUpload,
    getUploadSummaryRows
} from "../../state/upload/selectors";
import {
    ApplyTemplateAction,
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UpdateUploadAction,
    UploadJobTableRow,
} from "../../state/upload/types";
import { LabkeyTemplate } from "../../util/labkey-client/types";

const styles = require("./style.pcss");

const { Option } = Select;

interface Props {
    appliedTemplate: TemplateDraft;
    applyTemplate: ActionCreator<ApplyTemplateAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    openSchemaCreator: ActionCreator<OpenTemplateEditorAction>;
    removeTemplateIdFromSettings: ActionCreator<RemoveTemplateIdFromSettingsAction>;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    requestTemplates: ActionCreator<GetTemplatesAction>;
    savedTemplateIds: number[];
    setAlert: ActionCreator<SetAlertAction>;
    templates: LabkeyTemplate[];
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
}

interface AddCustomDataState {
    selectedFiles: string[];
}

class AddCustomData extends React.Component<Props, AddCustomDataState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedFiles: [],
        };
    }

    public render() {
        const {
            appliedTemplate,
            canRedo,
            canUndo,
            className,
            uploads,
        } = this.props;
        const disableSaveButton = !(uploads.length && appliedTemplate && this.requiredValuesPresent());
        return (
            <FormPage
                className={className}
                formTitle="ADD ADDITIONAL DATA"
                formPrompt="Review and add information to the files below and click Upload to submit the job."
                onSave={this.upload}
                saveButtonDisabled={disableSaveButton}
                saveButtonName="Upload"
                onBack={this.props.goBack}
            >
                {this.renderButtons()}
                {appliedTemplate && (
                    <CustomDataGrid
                        canRedo={canRedo}
                        canUndo={canUndo}
                        redo={this.redo}
                        removeTemplateIdFromSettings={this.props.removeTemplateIdFromSettings}
                        removeUploads={this.props.removeUploads}
                        template={appliedTemplate}
                        setAlert={this.props.setAlert}
                        undo={this.undo}
                        updateUpload={this.props.updateUpload}
                        uploads={uploads}
                    />
                )}
            </FormPage>
        );
    }

    private renderButtons = () => {
        const { appliedTemplate, templates } = this.props;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.schemaSelector}>
                <p className={styles.schemaSelectorLabel}>{`Apply ${SCHEMA_SYNONYM}`}</p>
                    <Select
                        autoFocus={true}
                        className={styles.schemaSelector}
                        onChange={this.selectTemplate}
                        placeholder={`Select a ${SCHEMA_SYNONYM.toLowerCase()} file`}
                        value={appliedTemplate ? appliedTemplate.name : undefined}
                    >
                        {templates.map(({Name: name}: LabkeyTemplate) => (
                            <Option key={name}>{name}</Option>
                        ))}
                    </Select>
                </div>
                <Button className={styles.createSchemaButton} onClick={this.props.openSchemaCreator}>
                    Create {SCHEMA_SYNONYM}
                </Button>
            </div>
        );
    }

    private selectTemplate = (templateName: string | null) => {
        const template = this.props.templates.find((t) => t.Name === templateName);
        if (template) {
            this.props.applyTemplate(templateName);
        }
    }

    private upload = (): void => {
        this.props.initiateUpload();
        this.props.goForward();
    }

    private requiredValuesPresent = (): boolean => {
        const {appliedTemplate} = this.props;
        if (appliedTemplate) {
            return !appliedTemplate.annotations.every(({annotationTypeName, name, required}: AnnotationDraft) => {
                if (!name) {
                    throw new Error("annotation is missing a name");
                }

                if (required && annotationTypeName !== ColumnType.BOOLEAN) {
                    return this.props.uploads.every((upload: any) => {
                        return Boolean(upload[name]);
                    });
                }
                return false;
            });
        }
        return true;
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
        appliedTemplate: getTemplateDraft(state),
        canRedo: getCanRedoUpload(state),
        canUndo: getCanUndoUpload(state),
        savedTemplateIds: getTemplateIds(state),
        schemaFile: getAppliedTemplateId(state),
        templates: getTemplates(state),
        uploads: getUploadSummaryRows(state),
    };
}

const dispatchToPropsMap = {
    applyTemplate,
    goBack,
    goForward,
    initiateUpload,
    jumpToUpload,
    openSchemaCreator: openTemplateEditor,
    removeTemplateIdFromSettings,
    removeUploads,
    requestTemplates,
    setAlert,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
