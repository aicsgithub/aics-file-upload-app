import { Alert, Button, Spin } from "antd";
import classNames from "classnames";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import FormPage from "../../components/FormPage";
import TemplateSearch from "../../components/TemplateSearch";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains, getUploadError } from "../../state/feedback/selectors";
import { AsyncRequest, OpenTemplateEditorAction, SetAlertAction } from "../../state/feedback/types";
import { startJobPoll } from "../../state/job/actions";
import { getCurrentJobName, getUploadInProgress } from "../../state/job/selectors";
import { StartJobPollAction } from "../../state/job/types";
import {
    getAnnotationTypes,
    getBooleanAnnotationTypeId,
    getChannels,
    getTemplates,
} from "../../state/metadata/selectors";
import { Channel } from "../../state/metadata/types";
import { goBack } from "../../state/route/actions";
import { GoBackAction, Page } from "../../state/route/types";
import {
    openTemplateEditor,
    toggleExpandedUploadJobRow,
} from "../../state/selection/actions";
import {
    getExpandedUploadJobRows,
    getSelectedBarcode,
    getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import {
    ExpandedRows,
    ToggleExpandedUploadJobRowAction,
    Well,
} from "../../state/selection/types";
import { getTemplateId } from "../../state/setting/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AnnotationType, Template } from "../../state/template/types";
import { State } from "../../state/types";
import {
    applyTemplate,
    initiateUpload,
    jumpToUpload,
    removeUploads,
    updateSubImages,
    updateUpload,
} from "../../state/upload/actions";
import {
    getCanRedoUpload,
    getCanUndoUpload,
    getFileToAnnotationHasValueMap,
    getUploadKeyToAnnotationErrorMap,
    getUploadSummaryRows,
    getUploadValidationErrors,
} from "../../state/upload/selectors";
import {
    ApplyTemplateAction,
    InitiateUploadAction,
    JumpToUploadAction,
    RemoveUploadsAction,
    UpdateSubImagesAction,
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
    canUndo: boolean;
    channels: Channel[];
    className?: string;
    currentJobName?: string;
    expandedRows: ExpandedRows;
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}};
    goBack: ActionCreator<GoBackAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    loading: boolean;
    openSchemaCreator: ActionCreator<OpenTemplateEditorAction>;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    savedTemplateId?: number;
    selectedBarcode?: string;
    setAlert: ActionCreator<SetAlertAction>;
    startJobPoll: ActionCreator<StartJobPollAction>;
    templates: LabkeyTemplate[];
    toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
    updateSubImages: ActionCreator<UpdateSubImagesAction>;
    updateUpload: ActionCreator<UpdateUploadAction>;
    uploadError?: string;
    uploadInProgress: boolean;
    uploadRowKeyToAnnotationErrorMap: {[key: string]: {[annotationName: string]: string}};
    uploads: UploadJobTableRow[];
    validationErrors: string[];
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
        const templateId = this.props.appliedTemplate ? this.props.appliedTemplate.templateId :
            this.props.savedTemplateId;
        if (templateId) {
            this.props.applyTemplate(templateId);
        }
    }

    public render() {
        const {
            annotationTypes,
            appliedTemplate,
            canRedo,
            canUndo,
            className,
            loading,
            uploadError,
            uploadInProgress,
            uploadRowKeyToAnnotationErrorMap,
            uploads,
            validationErrors,
        } = this.props;
        return (
            <FormPage
                className={className}
                formTitle="ADD ADDITIONAL DATA"
                formPrompt="Review and add information to the files below and click Upload to submit the job."
                onSave={this.upload}
                saveButtonDisabled={validationErrors.length > 0}
                saveInProgress={uploadInProgress}
                saveButtonName="Upload"
                onBack={this.props.goBack}
                page={Page.AddCustomData}
            >
                {this.renderButtons()}
                {loading && !appliedTemplate && (
                    <div className={styles.spinContainer}>
                        <div className={styles.spinText}>
                            Getting template details...
                        </div>
                        <Spin/>
                    </div>
                )}
                {uploadError && (
                    <Alert
                        className={styles.alert}
                        message="Upload Failed"
                        description={uploadError}
                        type="error"
                        showIcon={true}
                    />
                )}
                {validationErrors.length > 0 && (
                    <Alert
                        className={styles.alert}
                        message={validationErrors.map((e) => <div key={e}>{e}</div>)}
                        showIcon={true}
                        type="error"
                    />
                )}
                {appliedTemplate && this.renderPlateInfo()}
                {!loading && appliedTemplate && (
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
                        updateSubImages={this.props.updateSubImages}
                        updateUpload={this.props.updateUpload}
                        uploads={uploads}
                        validationErrors={uploadRowKeyToAnnotationErrorMap}
                    />
                )}
            </FormPage>
        );
    }

    private renderPlateInfo = () => {
        const { selectedBarcode } = this.props;
        if (!selectedBarcode) {
            return null;
        }

        return (
            <div className={styles.plateInfo}>
                <div>Plate Barcode: {selectedBarcode}</div>
            </div>
        );
    }

    private renderButtons = () => {
        const { appliedTemplate } = this.props;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.schemaSelector}>
                    <p className={styles.schemaSelectorLabel}>{`Select -or- Create ${SCHEMA_SYNONYM}`}</p>
                    <TemplateSearch
                        className={styles.schemaSelector}
                        value={appliedTemplate ? appliedTemplate.templateId : undefined}
                        onSelect={this.props.applyTemplate}
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

    private upload = (): void => {
        this.props.initiateUpload(this.props.currentJobName);
        this.props.startJobPoll();
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
        canUndo: getCanUndoUpload(state),
        channels: getChannels(state),
        currentJobName: getCurrentJobName(state),
        expandedRows: getExpandedUploadJobRows(state),
        fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
        loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
        savedTemplateId: getTemplateId(state),
        selectedBarcode: getSelectedBarcode(state),
        templates: getTemplates(state),
        uploadError: getUploadError(state),
        uploadInProgress: getUploadInProgress(state),
        uploadRowKeyToAnnotationErrorMap: getUploadKeyToAnnotationErrorMap(state),
        uploads: getUploadSummaryRows(state),
        validationErrors: getUploadValidationErrors(state),
    };
}

const dispatchToPropsMap = {
    applyTemplate,
    goBack,
    initiateUpload,
    jumpToUpload,
    openSchemaCreator: openTemplateEditor,
    removeUploads,
    setAlert,
    startJobPoll,
    toggleRowExpanded: toggleExpandedUploadJobRow,
    updateSubImages,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
