import { Button, Spin } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import FormPage from "../../components/FormPage";
import TemplateSearch from "../../components/TemplateSearch";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest, SetAlertAction } from "../../state/feedback/types";
import { requestTemplates } from "../../state/metadata/actions";
import { getAnnotationTypes, getBooleanAnnotationTypeId, getTemplates } from "../../state/metadata/selectors";
import { GetTemplatesAction } from "../../state/metadata/types";
import { goBack, goForward, openTemplateEditor } from "../../state/selection/actions";
import { GoBackAction, NextPageAction, OpenTemplateEditorAction } from "../../state/selection/types";
import { getTemplateIds } from "../../state/setting/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AnnotationType, Template, TemplateAnnotation } from "../../state/template/types";
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

interface Props {
    annotationTypes: AnnotationType[];
    appliedTemplate?: Template;
    applyTemplate: ActionCreator<ApplyTemplateAction>;
    booleanAnnotationTypeId?: number;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    loading: boolean;
    openSchemaCreator: ActionCreator<OpenTemplateEditorAction>;
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
            annotationTypes,
            appliedTemplate,
            canRedo,
            canUndo,
            className,
            loading,
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
                {loading && (
                    <div className={styles.spinContainer}>
                        <div className={styles.spinText}>
                            Getting template details...
                        </div>
                        <Spin/>
                    </div>
                )}
                {appliedTemplate && (
                    <CustomDataGrid
                        annotationTypes={annotationTypes}
                        canRedo={canRedo}
                        canUndo={canUndo}
                        redo={this.redo}
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
                    <TemplateSearch
                        className={styles.schemaSelector}
                        value={appliedTemplate ? appliedTemplate.name : undefined}
                        onSelect={this.selectTemplate}
                        templates={templates}
                    />
                </div>
                <Button className={styles.createSchemaButton} onClick={this.openTemplateEditor}>
                    Create {SCHEMA_SYNONYM}
                </Button>
            </div>
        );
    }

    private openTemplateEditor = () => this.props.openSchemaCreator();

    private selectTemplate = (templateName: string) => {
        const template = this.props.templates.find((t) => t.Name === templateName);
        if (template) {
            this.props.applyTemplate(template);
        }
    }

    private upload = (): void => {
        this.props.initiateUpload();
        this.props.goForward();
    }

    private requiredValuesPresent = (): boolean => {
        const {appliedTemplate, booleanAnnotationTypeId} = this.props;
        if (appliedTemplate) {
            return !appliedTemplate.annotations.every(({annotationTypeId, name, required}: TemplateAnnotation) => {
                if (!name) {
                    throw new Error("annotation is missing a name");
                }

                if (required && annotationTypeId !== booleanAnnotationTypeId) {
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
        annotationTypes: getAnnotationTypes(state),
        appliedTemplate: getAppliedTemplate(state),
        booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
        canRedo: getCanRedoUpload(state),
        canUndo: getCanUndoUpload(state),
        loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
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
    removeUploads,
    requestTemplates,
    setAlert,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
