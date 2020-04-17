import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Alert, Button, Spin } from "antd";
import classNames from "classnames";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import FormPage from "../../components/FormPage";
import JobOverviewDisplay from "../../components/JobOverviewDisplay";
import TemplateSearch from "../../components/TemplateSearch";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains, getUploadError } from "../../state/feedback/selectors";
import { AsyncRequest, OpenTemplateEditorAction, SetAlertAction } from "../../state/feedback/types";
import { getUploadInProgress } from "../../state/job/selectors";
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
    getSelectedJob,
    getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import {
    ExpandedRows,
    ToggleExpandedUploadJobRowAction,
    Well,
} from "../../state/selection/types";
import { getAssociateByWorkflow, getTemplateId } from "../../state/setting/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AnnotationType, Template } from "../../state/template/types";
import { State } from "../../state/types";
import {
    applyTemplate,
    initiateUpload,
    jumpToUpload,
    removeUploads,
    submitFileMetadataUpdate,
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
    SubmitFileMetadataUpdateAction,
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
    associateByWorkflow: boolean;
    booleanAnnotationTypeId?: number;
    canRedo: boolean;
    canUndo: boolean;
    channels: Channel[];
    className?: string;
    expandedRows: ExpandedRows;
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}};
    goBack: ActionCreator<GoBackAction>;
    initiateUpload: ActionCreator<InitiateUploadAction>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    loading: boolean; // todo separate PR rename
    loadingFileMetadata: boolean;
    openSchemaCreator: ActionCreator<OpenTemplateEditorAction>;
    removeUploads: ActionCreator<RemoveUploadsAction>;
    savedTemplateId?: number;
    selectedBarcode?: string;
    selectedJob?: JSSJob;
    setAlert: ActionCreator<SetAlertAction>;
    submitFileMetadataUpdate: ActionCreator<SubmitFileMetadataUpdateAction>;
    templates: LabkeyTemplate[];
    toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
    updateInProgress: boolean;
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
            associateByWorkflow,
            canRedo,
            canUndo,
            className,
            loading,
            loadingFileMetadata,
            selectedJob,
            updateInProgress,
            uploadError,
            uploadInProgress,
            uploadRowKeyToAnnotationErrorMap,
            uploads,
            validationErrors,
        } = this.props;
        const showLoading = loading || loadingFileMetadata;
        return (
            <FormPage
                backButtonDisabled={!!selectedJob}
                className={className}
                formTitle={selectedJob ? "EDIT UPLOAD JOB" : "ADD ADDITIONAL DATA"}
                formPrompt="Review and add information to the files below and click Submit."
                onSave={this.submit}
                saveButtonDisabled={validationErrors.length > 0}
                saveInProgress={uploadInProgress || updateInProgress}
                saveButtonName="Submit"
                showProgressBar={!selectedJob}
                onBack={this.props.goBack}
                page={Page.AddCustomData}
            >
                {selectedJob && (
                    <JobOverviewDisplay job={selectedJob}/>
                )}
                {!loadingFileMetadata && this.renderButtons()}
                {showLoading && (
                    <div className={styles.spinContainer}>
                        <div className={styles.spinText}>
                            Loading...
                        </div>
                        <Spin/>
                    </div>
                )}
                {!showLoading && uploadError && (
                    <Alert
                        className={styles.alert}
                        message="Upload Failed"
                        description={uploadError}
                        type="error"
                        showIcon={true}
                    />
                )}
                {!showLoading && validationErrors.length > 0 && (
                    validationErrors.map((e: string) => (<Alert
                        className={styles.alert}
                        key={e}
                        message={e}
                        showIcon={true}
                        type="error"
                    />))
                )}
                {appliedTemplate && this.renderPlateInfo()}
                {!showLoading && appliedTemplate && (
                    <CustomDataGrid
                        allWellsForSelectedPlate={this.props.allWellsForSelectedPlate}
                        annotationTypes={annotationTypes}
                        associateByWorkflow={associateByWorkflow}
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
        const { appliedTemplate, loading } = this.props;

        return (
            <div className={styles.buttonRow}>
                <div className={styles.schemaSelector}>
                    <p className={styles.schemaSelectorLabel}>{`Select -or- Create ${SCHEMA_SYNONYM}`}</p>
                    <TemplateSearch
                        className={styles.schemaSelector}
                        disabled={loading}
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

    private submit = (): void => {
        if (this.props.selectedJob) {
            this.props.submitFileMetadataUpdate();
        } else {
            this.props.initiateUpload();
        }
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
        associateByWorkflow: getAssociateByWorkflow(state),
        booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
        canRedo: getCanRedoUpload(state),
        canUndo: getCanUndoUpload(state),
        channels: getChannels(state),
        expandedRows: getExpandedUploadJobRows(state),
        fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
        loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
        loadingFileMetadata: getRequestsInProgressContains(state, AsyncRequest.REQUEST_FILE_METADATA_FOR_JOB),
        savedTemplateId: getTemplateId(state),
        selectedBarcode: getSelectedBarcode(state),
        selectedJob: getSelectedJob(state),
        templates: getTemplates(state),
        updateInProgress: getRequestsInProgressContains(state, AsyncRequest.UPDATE_FILE_METADATA),
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
    submitFileMetadataUpdate,
    toggleRowExpanded: toggleExpandedUploadJobRow,
    updateSubImages,
    updateUpload,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
