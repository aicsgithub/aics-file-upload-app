import { Alert, Spin } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import FormPage from "../../components/FormPage";
import JobOverviewDisplay from "../../components/JobOverviewDisplay";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { UploadServiceFields } from "../../services/aicsfiles/types";
import { JSSJob, JSSJobStatus } from "../../services/job-status-client/types";
import {
  AnnotationType,
  Channel,
  LabkeyTemplate,
} from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import { setAlert } from "../../state/feedback/actions";
import {
  getRequestsInProgressContains,
  getUploadError,
} from "../../state/feedback/selectors";
import { SetAlertAction } from "../../state/feedback/types";
import { getUploadInProgress } from "../../state/job/selectors";
import {
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getChannels,
  getTemplates,
} from "../../state/metadata/selectors";
import { goBack } from "../../state/route/actions";
import { GoBackAction } from "../../state/route/types";
import {
  selectBarcode,
  toggleExpandedUploadJobRow,
} from "../../state/selection/actions";
import {
  getExpandedUploadJobRows,
  getSelectedBarcode,
  getSelectedJob,
  getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import {
  ToggleExpandedUploadJobRowAction,
  Well,
} from "../../state/selection/types";
import { updateSettings } from "../../state/setting/actions";
import {
  getAssociateByWorkflow,
  getShowUploadHint,
  getTemplateId,
} from "../../state/setting/selectors";
import { UpdateSettingsAction } from "../../state/setting/types";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AsyncRequest, ExpandedRows, Page, State } from "../../state/types";
import {
  applyTemplate,
  initiateUpload,
  jumpToUpload,
  removeUploads,
  submitFileMetadataUpdate,
  updateAndRetryUpload,
  updateSubImages,
  updateUpload,
  updateUploadRows,
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
  UpdateAndRetryUploadAction,
  UpdateSubImagesAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UploadJobTableRow,
} from "../../state/upload/types";
import BarcodeSearch from "../BarcodeSearch";

import { getCanSubmitUpload, getUpdateInProgress } from "./selectors";

const styles = require("./style.pcss");

interface Props {
  allWellsForSelectedPlate: Well[][];
  annotationTypes: AnnotationType[];
  appliedTemplate?: Template;
  applyTemplate: ActionCreator<ApplyTemplateAction>;
  associateByWorkflow: boolean;
  booleanAnnotationTypeId?: number;
  canRedo: boolean;
  canSubmit: boolean;
  canUndo: boolean;
  channels: Channel[];
  className?: string;
  expandedRows: ExpandedRows;
  fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } };
  goBack: ActionCreator<GoBackAction>;
  initiateUpload: ActionCreator<InitiateUploadAction>;
  jumpToUpload: ActionCreator<JumpToUploadAction>;
  loading: boolean;
  loadingFileMetadata: boolean;
  removeUploads: ActionCreator<RemoveUploadsAction>;
  savedTemplateId?: number;
  selectBarcode: typeof selectBarcode;
  selectedBarcode?: string;
  selectedJob?: JSSJob<UploadServiceFields>;
  setAlert: ActionCreator<SetAlertAction>;
  showUploadHint: boolean;
  submitFileMetadataUpdate: ActionCreator<SubmitFileMetadataUpdateAction>;
  templates: LabkeyTemplate[];
  toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
  updateAndRetryUpload: ActionCreator<UpdateAndRetryUploadAction>;
  updateInProgress: boolean;
  updateSettings: ActionCreator<UpdateSettingsAction>;
  updateSubImages: ActionCreator<UpdateSubImagesAction>;
  updateUpload: ActionCreator<UpdateUploadAction>;
  updateUploadRows: ActionCreator<UpdateUploadRowsAction>;
  uploadError?: string;
  uploadInProgress: boolean;
  uploadRowKeyToAnnotationErrorMap: {
    [key: string]: { [annotationName: string]: string };
  };
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

  public get isReadOnly() {
    return (
      !!this.props.selectedJob &&
      ![JSSJobStatus.SUCCEEDED, JSSJobStatus.FAILED].includes(
        this.props.selectedJob.status
      )
    );
  }

  public componentDidMount() {
    const templateId = this.props.appliedTemplate
      ? this.props.appliedTemplate.templateId
      : this.props.savedTemplateId;
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
      canSubmit,
      canUndo,
      className,
      loading,
      loadingFileMetadata,
      selectedJob,
      updateInProgress,
      showUploadHint,
      uploadError,
      uploadInProgress,
      uploadRowKeyToAnnotationErrorMap,
      uploads,
      validationErrors,
    } = this.props;
    const showLoading = loading || loadingFileMetadata;
    let saveButtonText = "Upload";
    let title = "ADD ADDITIONAL DATA";
    let prompt =
      "Review and add information to the files below and click Upload to submit the job.";
    if (selectedJob) {
      title = "UPLOAD DETAILS";
      if (this.isReadOnly) {
        prompt = "";
      } else {
        prompt =
          "Make any changes necessary and click Update to update the upload";
        if (selectedJob.status === JSSJobStatus.SUCCEEDED) {
          saveButtonText = "Update";
        } else {
          saveButtonText = "Retry";
        }
      }
    }
    return (
      <FormPage
        backButtonDisabled={!!selectedJob}
        className={className}
        formTitle={title}
        formPrompt={prompt}
        onSave={this.submit}
        saveButtonDisabled={!canSubmit}
        saveInProgress={uploadInProgress || updateInProgress}
        saveButtonName={saveButtonText}
        hideProgressBar={!!selectedJob}
        hideBackButton={!!selectedJob}
        hideSaveButton={this.isReadOnly}
        onBack={this.props.goBack}
        page={Page.AddCustomData}
      >
        {selectedJob && <JobOverviewDisplay job={selectedJob} />}
        {!loadingFileMetadata && this.renderButtons()}
        {showLoading && (
          <div className={styles.spinContainer}>
            <div className={styles.spinText}>Loading...</div>
            <Spin />
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
          <Alert
            className={styles.alert}
            message={validationErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
            showIcon={true}
            type="error"
          />
        )}
        {!showLoading &&
          appliedTemplate &&
          showUploadHint &&
          !this.isReadOnly && (
            <Alert
              afterClose={this.hideHint}
              className={styles.alert}
              closable={true}
              message="Hint: You can add multiple values for Text and Number annotations using commas!"
              showIcon={true}
              type="info"
            />
          )}
        {!showLoading && appliedTemplate && (
          <CustomDataGrid
            allWellsForSelectedPlate={this.props.allWellsForSelectedPlate}
            annotationTypes={annotationTypes}
            associateByWorkflow={associateByWorkflow}
            canRedo={canRedo}
            canUndo={canUndo}
            channels={this.props.channels}
            editable={!this.isReadOnly}
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
            updateUploadRows={this.props.updateUploadRows}
            uploads={uploads}
            validationErrors={uploadRowKeyToAnnotationErrorMap}
          />
        )}
      </FormPage>
    );
  }

  private renderButtons = () => {
    const { appliedTemplate, loading, selectedBarcode } = this.props;

    return (
      <div className={styles.selectors}>
        <LabeledInput className={styles.schemaSelector} label={SCHEMA_SYNONYM}>
          <TemplateSearch
            allowCreate={true}
            className={styles.schemaSelector}
            disabled={loading || this.isReadOnly}
            value={appliedTemplate ? appliedTemplate.templateId : undefined}
            onSelect={this.props.applyTemplate}
          />
        </LabeledInput>
        {selectedBarcode && (
          <LabeledInput label="Plate Barcode" className={styles.barcode}>
            <BarcodeSearch
              barcode={selectedBarcode}
              disabled={true} // TODO remove in FUA-5
              onBarcodeChange={(imagingSessionIds, barcode) => {
                if (barcode) {
                  this.props.selectBarcode(barcode, imagingSessionIds);
                }
              }}
            />
          </LabeledInput>
        )}
      </div>
    );
  };

  private submit = (): void => {
    if (this.props.selectedJob) {
      if (this.props.selectedJob.status === JSSJobStatus.SUCCEEDED) {
        this.props.submitFileMetadataUpdate();
      }
      if (this.props.selectedJob.status === JSSJobStatus.FAILED) {
        this.props.updateAndRetryUpload();
      }
    } else {
      this.props.initiateUpload();
    }
  };

  private undo = (): void => {
    this.props.jumpToUpload(-1);
  };

  private redo = (): void => {
    this.props.jumpToUpload(1);
  };

  private hideHint = () => this.props.updateSettings({ showUploadHint: false });
}

function mapStateToProps(state: State) {
  return {
    allWellsForSelectedPlate: getWellsWithUnitsAndModified(state),
    annotationTypes: getAnnotationTypes(state),
    appliedTemplate: getAppliedTemplate(state),
    associateByWorkflow: getAssociateByWorkflow(state),
    booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
    canRedo: getCanRedoUpload(state),
    canSubmit: getCanSubmitUpload(state),
    canUndo: getCanUndoUpload(state),
    channels: getChannels(state),
    expandedRows: getExpandedUploadJobRows(state),
    fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
    loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
    loadingFileMetadata: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_FILE_METADATA_FOR_JOB
    ),
    savedTemplateId: getTemplateId(state),
    selectedBarcode: getSelectedBarcode(state),
    selectedJob: getSelectedJob(state),
    showUploadHint: getShowUploadHint(state),
    templates: getTemplates(state),
    updateInProgress: getUpdateInProgress(state),
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
  removeUploads,
  selectBarcode,
  setAlert,
  submitFileMetadataUpdate,
  toggleRowExpanded: toggleExpandedUploadJobRow,
  updateAndRetryUpload,
  updateSettings,
  updateSubImages,
  updateUpload,
  updateUploadRows,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
