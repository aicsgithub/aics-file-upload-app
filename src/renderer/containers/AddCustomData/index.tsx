import { Button, Spin } from "antd";
import classNames from "classnames";
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
import {
    getAnnotationTypes,
    getBooleanAnnotationTypeId,
    getChannels,
    getTemplates,
} from "../../state/metadata/selectors";
import { Channel, GetTemplatesAction, ImagingSession } from "../../state/metadata/types";
import { goBack, openTemplateEditor, toggleExpandedUploadJobRow } from "../../state/selection/actions";
import {
    getExpandedUploadJobRows,
    getSelectedBarcode,
    getSelectedImagingSession,
    getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import { Page } from "../../state/selection/types";
import {
    ExpandedRows,
    GoBackAction,
    OpenTemplateEditorAction,
    ToggleExpandedUploadJobRowAction,
    Well,
} from "../../state/selection/types";
import { getTemplateIds } from "../../state/setting/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AnnotationType, Template } from "../../state/template/types";
import { State } from "../../state/types";
import {
    applyTemplate,
    initiateUpload,
    jumpToUpload,
    removeUploads,
    updateScenes,
    updateUpload,
} from "../../state/upload/actions";
import {
    getCanRedoUpload,
    getCanSave,
    getCanUndoUpload,
    getFileToAnnotationHasValueMap,
    getUploadSummaryRows,
    getValidationErrorsMap,
} from "../../state/upload/selectors";
import {
    ApplyTemplateAction,
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UpdateScenesAction,
    UpdateUploadAction,
    UploadJobTableRow,
} from "../../state/upload/types";
import { LabkeyTemplate } from "../../util/labkey-client/types";

const styles = require("./style.pcss");

interface Props {
    allWellsForSelectedPlate: Well[][];
    annotationTypes: AnnotationType[];
    appliedTemplate?: Template;
    applyTemplate: ActionCreator<ApplyTemplateAction>;
    booleanAnnotationTypeId?: number;
    canRedo: boolean;
    canSave: boolean;
    canUndo: boolean;
    channels: Channel[];
    className?: string;
    expandedRows: ExpandedRows;
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}};
    goBack: ActionCreator<GoBackAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    loading: boolean;
    openSchemaCreator: ActionCreator<OpenTemplateEditorAction>;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    requestTemplates: ActionCreator<GetTemplatesAction>;
    savedTemplateIds: number[];
    selectedBarcode?: string;
    selectedImagingSession?: ImagingSession;
    setAlert: ActionCreator<SetAlertAction>;
    templates: LabkeyTemplate[];
    toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
    updateScenes: ActionCreator<UpdateScenesAction>;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploads: UploadJobTableRow[];
    validationErrors: {[key: string]: {[annotationName: string]: string}};
}

interface AddCustomDataState {
    selectedFiles: string[];
}

/**
 * Renders template selector and custom data grid for adding additional data to each file.
 */
class AddCustomData extends React.Component<Props, AddCustomDataState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedFiles: [],
        };
    }

    public componentDidMount() {
        this.props.requestTemplates();
    }

    public render() {
        const {
            annotationTypes,
            appliedTemplate,
            canRedo,
            canSave,
            canUndo,
            className,
            loading,
            uploads,
            validationErrors,
        } = this.props;
        return (
            <FormPage
                className={className}
                formTitle="ADD ADDITIONAL DATA"
                formPrompt="Review and add information to the files below and click Upload to submit the job."
                onSave={this.upload}
                saveButtonDisabled={!canSave}
                saveButtonName="Upload"
                onBack={this.props.goBack}
                page={Page.AddCustomData}
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
                {appliedTemplate && this.renderPlateInfo()}
                {appliedTemplate && (
                    <CustomDataGrid
                        allWellsForSelectedPlate={this.props.allWellsForSelectedPlate}
                        annotationTypes={annotationTypes}
                        canRedo={canRedo}
                        canUndo={canUndo}
                        channels={this.props.channels}
                        expandedRows={this.props.expandedRows}
                        fileToAnnotationHasValueMap={this.props.fileToAnnotationHasValueMap}
                        redo={this.redo}
                        removeUploads={this.props.removeUploads}
                        template={appliedTemplate}
                        setAlert={this.props.setAlert}
                        toggleRowExpanded={this.props.toggleRowExpanded}
                        undo={this.undo}
                        updateScenes={this.props.updateScenes}
                        updateUpload={this.props.updateUpload}
                        uploads={uploads}
                        validationErrors={validationErrors}
                    />
                )}
            </FormPage>
        );
    }

    private renderPlateInfo = () => {
        const { selectedBarcode, selectedImagingSession } = this.props;
        if (!selectedBarcode) {
            return null;
        }

        return (
            <div className={styles.plateInfo}>
                <div>Plate Barcode: {selectedBarcode}</div>
                {selectedImagingSession && <div>Imaging Session: {selectedImagingSession.name}</div>}
            </div>
        );
    }

    private renderButtons = () => {
        const { appliedTemplate, templates } = this.props;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.schemaSelector}>
                    <p className={styles.schemaSelectorLabel}>{`Select -or- Create ${SCHEMA_SYNONYM}`}</p>
                    <TemplateSearch
                        className={styles.schemaSelector}
                        value={appliedTemplate ? appliedTemplate.templateId : undefined}
                        onSelect={this.selectTemplate}
                        templates={templates}
                    />
                </div>
                <Button
                    icon="plus-circle"
                    className={classNames(styles.templateButton, styles.createTemplateButton)}
                    onClick={this.openTemplateEditor}
                >
                    Create {SCHEMA_SYNONYM}
                </Button>
                <Button
                    icon="edit"
                    disabled={!appliedTemplate}
                    className={styles.templateButton}
                    onClick={this.openTemplateEditorWithId(appliedTemplate && appliedTemplate.templateId)}
                >
                    Edit {SCHEMA_SYNONYM}
                </Button>
            </div>
        );
    }

    private openTemplateEditor = () => this.props.openSchemaCreator();
    private openTemplateEditorWithId = (id: number | undefined) => () => this.props.openSchemaCreator(id);

    private selectTemplate = (templateId: number) => {
        const template = this.props.templates.find((t) => t.TemplateId === templateId);
        if (template) {
            this.props.applyTemplate(template);
        }
    }

    private upload = (): void => {
        this.props.initiateUpload();
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
        allWellsForSelectedPlate: getWellsWithUnitsAndModified(state),
        annotationTypes: getAnnotationTypes(state),
        appliedTemplate: getAppliedTemplate(state),
        booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
        canRedo: getCanRedoUpload(state),
        canSave: getCanSave(state),
        canUndo: getCanUndoUpload(state),
        channels: getChannels(state),
        expandedRows: getExpandedUploadJobRows(state),
        fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
        loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
        savedTemplateIds: getTemplateIds(state),
        selectedBarcode: getSelectedBarcode(state),
        selectedImagingSession: getSelectedImagingSession(state),
        templates: getTemplates(state),
        uploads: getUploadSummaryRows(state),
        validationErrors: getValidationErrorsMap(state),
    };
}

const dispatchToPropsMap = {
    applyTemplate,
    goBack,
    initiateUpload,
    jumpToUpload,
    openSchemaCreator: openTemplateEditor,
    removeUploads,
    requestTemplates,
    setAlert,
    toggleRowExpanded: toggleExpandedUploadJobRow,
    updateScenes,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
