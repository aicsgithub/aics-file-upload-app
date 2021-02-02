import { Alert, Button, Icon, Select, Spin } from "antd";
import classNames from "classnames";
import { ipcRenderer, OpenDialogOptions } from "electron";
import { find } from "lodash";
import * as React from "react";
import { ReactNodeArray } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { PLATE_CREATED, SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import DragAndDrop from "../../components/DragAndDrop";
import JobOverviewDisplay from "../../components/JobOverviewDisplay";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { UploadServiceFields } from "../../services/aicsfiles/types";
import { JSSJob, JSSJobStatus } from "../../services/job-status-client/types";
import {
  AnnotationType,
  BarcodePrefix,
  Channel,
  LabkeyTemplate,
} from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import { setAlert } from "../../state/feedback/actions";
import {
  getIsLoading,
  getRequestsInProgressContains,
  getUploadError,
} from "../../state/feedback/selectors";
import { SetAlertAction } from "../../state/feedback/types";
import { createBarcode } from "../../state/metadata/actions";
import {
  getAnnotationTypes,
  getBarcodePrefixes,
  getBooleanAnnotationTypeId,
  getChannels,
  getTemplates,
} from "../../state/metadata/selectors";
import { CreateBarcodeAction } from "../../state/metadata/types";
import { closeUpload } from "../../state/route/actions";
import { CloseUploadAction } from "../../state/route/types";
import {
  loadFilesFromDragAndDrop,
  openFilesFromDialog,
  selectBarcode,
  toggleExpandedUploadJobRow,
  updateMassEditRow,
} from "../../state/selection/actions";
import {
  getExpandedUploadJobRows,
  getSelectedBarcode,
  getSelectedJob,
  getWellsWithUnitsAndModified,
  getMassEditRow,
} from "../../state/selection/selectors";
import {
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  SelectBarcodeAction,
  ToggleExpandedUploadJobRowAction,
  UpdateMassEditRowAction,
  Well,
} from "../../state/selection/types";
import {
  associateByWorkflow,
  updateSettings,
} from "../../state/setting/actions";
import {
  getAssociateByWorkflow,
  getShowUploadHint,
  getTemplateId,
} from "../../state/setting/selectors";
import {
  AssociateByWorkflowAction,
  UpdateSettingsAction,
} from "../../state/setting/types";
import { getAppliedTemplate } from "../../state/template/selectors";
import {
  AsyncRequest,
  DragAndDropFileList,
  ExpandedRows,
  MassEditRow,
  State,
} from "../../state/types";
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

import { getCanSubmitUpload, getUploadInProgress } from "./selectors";

const styles = require("./style.pcss");

interface Props {
  allWellsForSelectedPlate: Well[][];
  annotationTypes: AnnotationType[];
  appliedTemplate?: Template;
  applyTemplate: ActionCreator<ApplyTemplateAction>;
  associateByWorkflow: ActionCreator<AssociateByWorkflowAction>;
  barcodePrefixes: BarcodePrefix[];
  booleanAnnotationTypeId?: number;
  canRedo: boolean;
  canSubmit: boolean;
  canUndo: boolean;
  closeUpload: ActionCreator<CloseUploadAction>;
  channels: Channel[];
  createBarcode: ActionCreator<CreateBarcodeAction>;
  expandedRows: ExpandedRows;
  isAssociatedByWorkflow: boolean;
  fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } };
  initiateUpload: ActionCreator<InitiateUploadAction>;
  jumpToUpload: ActionCreator<JumpToUploadAction>;
  loading: boolean;
  loadFilesFromDragAndDrop: (
    files: DragAndDropFileList
  ) => LoadFilesFromDragAndDropAction;
  massEditRow: MassEditRow;
  openFilesFromDialog: (files: string[]) => LoadFilesFromOpenDialogAction;
  removeUploads: ActionCreator<RemoveUploadsAction>;
  savedTemplateId?: number;
  selectBarcode: ActionCreator<SelectBarcodeAction>;
  selectedBarcode?: string;
  selectedJob?: JSSJob<UploadServiceFields>;
  selectedJobIsLoading: boolean;
  setAlert: ActionCreator<SetAlertAction>;
  showUploadHint: boolean;
  submitFileMetadataUpdate: ActionCreator<SubmitFileMetadataUpdateAction>;
  templateIsLoading: boolean;
  templates: LabkeyTemplate[];
  toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
  updateAndRetryUpload: ActionCreator<UpdateAndRetryUploadAction>;
  updateMassEditRow: ActionCreator<UpdateMassEditRowAction>;
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

// On Windows, file browsers cannot look for directories and files at the same time
// directories are the default in that case
const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "openDirectory", "multiSelections"],
  title: "Browse for folders, or drag and drop files/folders onto app",
};

/**
 * Renders template selector and custom data grid for adding additional data to each file.
 */
class AddCustomData extends React.Component<Props, AddCustomDataState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      selectedFiles: [],
    };

    // During the "Create Barcode" path the user will create a plate, triggering this. From here we can proceed
    // to associating files and wells, note this will now become essentially the same path as "Enter Barcode"
    ipcRenderer.on(
      PLATE_CREATED,
      (_: any, barcode: string, imagingSessionId: number | null) => {
        this.props.selectBarcode(barcode, [imagingSessionId], imagingSessionId);
      }
    );
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
      canRedo,
      canSubmit,
      canUndo,
      isAssociatedByWorkflow,
      loading,
      massEditRow,
      selectedJob,
      selectedJobIsLoading,
      templateIsLoading,
      uploadInProgress,
      uploadRowKeyToAnnotationErrorMap,
      uploads,
    } = this.props;
    let saveButtonText = "Upload";
    if (selectedJob) {
      if (selectedJob.status === JSSJobStatus.SUCCEEDED) {
        saveButtonText = "Update";
      } else {
        saveButtonText = "Retry";
      }
    }
    return (
      <DragAndDrop
        disabled={Boolean(selectedJob) || this.isReadOnly}
        overlayChildren={!Object.keys(uploads).length && !loading}
        onDrop={this.props.loadFilesFromDragAndDrop}
        onOpen={this.props.openFilesFromDialog}
        openDialogOptions={openDialogOptions}
      >
        <div className={styles.contentContainer}>
          {selectedJob && <JobOverviewDisplay job={selectedJob} />}
          {!selectedJobIsLoading && this.renderTemplateAndUploadTypeInput()}
          {loading || templateIsLoading || selectedJobIsLoading ? (
            <div className={styles.spinContainer}>
              <div>Loading...</div>
              <Spin />
            </div>
          ) : (
            <>
              {this.renderAlerts()}
              <CustomDataGrid
                allWellsForSelectedPlate={this.props.allWellsForSelectedPlate}
                annotationTypes={annotationTypes}
                associateByWorkflow={isAssociatedByWorkflow}
                canRedo={canRedo}
                canUndo={canUndo}
                channels={this.props.channels}
                editable={!this.isReadOnly}
                expandedRows={this.props.expandedRows}
                fileToAnnotationHasValueMap={
                  this.props.fileToAnnotationHasValueMap
                }
                massEditRow={massEditRow}
                redo={this.redo}
                removeUploads={this.props.removeUploads}
                template={appliedTemplate}
                setAlert={this.props.setAlert}
                toggleRowExpanded={this.props.toggleRowExpanded}
                undo={this.undo}
                updateMassEditRow={this.props.updateMassEditRow}
                updateSubImages={this.props.updateSubImages}
                updateUpload={this.props.updateUpload}
                updateUploadRows={this.props.updateUploadRows}
                uploads={uploads}
                validationErrors={uploadRowKeyToAnnotationErrorMap}
              />
            </>
          )}
        </div>
        <div className={styles.saveButtonContainer}>
          <Button
            className={styles.cancelButton}
            size="large"
            onClick={() => this.props.closeUpload()}
            disabled={!Object.keys(uploads).length}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={this.submit}
            disabled={!canSubmit}
          >
            {uploadInProgress ? (
              <>
                Loading&nbsp;
                <Icon type="loading" className={styles.loading} spin={true} />
              </>
            ) : (
              saveButtonText
            )}
          </Button>
        </div>
      </DragAndDrop>
    );
  }

  private renderTemplateAndUploadTypeInput = () => {
    const {
      appliedTemplate,
      associateByWorkflow,
      barcodePrefixes,
      createBarcode,
      isAssociatedByWorkflow,
      selectedBarcode,
      templateIsLoading,
    } = this.props;
    const onCreateBarcode = (selectedPrefixId: any) => {
      createBarcode(
        find(barcodePrefixes, (prefix) => prefix.prefixId === selectedPrefixId)
      );
    };

    return (
      <>
        <div className={styles.container}>
          <Icon
            className={classNames(
              styles.icon,
              !appliedTemplate ? styles.hidden : undefined
            )}
            type="check-circle"
          />
          <LabeledInput
            className={styles.selector}
            label={`Select ${SCHEMA_SYNONYM}`}
          >
            <TemplateSearch
              allowCreate={true}
              disabled={templateIsLoading || this.isReadOnly}
              value={appliedTemplate ? appliedTemplate.templateId : undefined}
              onSelect={this.props.applyTemplate}
            />
          </LabeledInput>
        </div>
        <div className={styles.container}>
          <Icon
            className={classNames(
              styles.icon,
              !selectedBarcode && !isAssociatedByWorkflow
                ? styles.hidden
                : undefined
            )}
            type="check-circle"
          />
          <LabeledInput className={styles.label} label="Select Upload Type">
            <div className={styles.container}>
              <div>
                <div className={styles.helpText}>
                  The barcode you enter will be used to associate your files
                  with wells
                </div>
                <BarcodeSearch
                  barcode={selectedBarcode}
                  disabled={this.isReadOnly}
                  onBarcodeChange={(imagingSessionIds, barcode) => {
                    if (barcode) {
                      this.props.selectBarcode(barcode, imagingSessionIds);
                    }
                  }}
                />
              </div>
              <div className={styles.separatorText}>OR</div>
              <div>
                <div className={styles.helpText}>
                  Selecting a barcode prefix will prompt you to create a plate
                  in LabKey with said prefix
                </div>
                <Select
                  className={styles.selector}
                  disabled={this.isReadOnly}
                  onSelect={onCreateBarcode}
                  placeholder="Select Barcode Prefix"
                >
                  {barcodePrefixes.map(({ prefixId, description }) => (
                    <Select.Option value={prefixId} key={prefixId}>
                      {description}
                    </Select.Option>
                  ))}
                </Select>
              </div>
              <div className={styles.separatorText}>OR</div>
              <div>
                <div className={styles.helpText}>
                  If you do not have a plate to associate your files with you
                  can select to associate with workflows
                </div>
                <Button
                  disabled={isAssociatedByWorkflow || this.isReadOnly}
                  onClick={() => associateByWorkflow(true)}
                >
                  {isAssociatedByWorkflow
                    ? "Selected"
                    : "Associate with Workflows"}
                </Button>
              </div>
            </div>
          </LabeledInput>
        </div>
      </>
    );
  };

  private renderAlerts = (): ReactNodeArray => {
    const alerts: ReactNodeArray = [];
    if (!Object.keys(this.props.uploads).length) {
      return alerts;
    }
    if (this.props.uploadError) {
      alerts.push(
        <Alert
          className={styles.alert}
          message="Upload Failed"
          description={this.props.uploadError}
          type="error"
          showIcon={true}
          key="upload-failed"
        />
      );
    }
    if (this.props.validationErrors.length > 0) {
      alerts.push(
        <Alert
          className={styles.alert}
          message={this.props.validationErrors.map((e) => (
            <div key={e}>{e}</div>
          ))}
          showIcon={true}
          type="error"
          key="validation-errors"
        />
      );
    }
    if (
      this.props.appliedTemplate &&
      this.props.showUploadHint &&
      !this.isReadOnly
    ) {
      alerts.push(
        <Alert
          afterClose={this.hideHint}
          className={styles.alert}
          closable={true}
          message="Hint: You can add multiple values for Text and Number annotations using commas!"
          showIcon={true}
          type="info"
          key="hint"
        />
      );
    }
    return alerts;
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
    barcodePrefixes: getBarcodePrefixes(state),
    booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
    canRedo: getCanRedoUpload(state),
    canSubmit: getCanSubmitUpload(state),
    canUndo: getCanUndoUpload(state),
    channels: getChannels(state),
    expandedRows: getExpandedUploadJobRows(state),
    fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
    isAssociatedByWorkflow: getAssociateByWorkflow(state),
    loading: getIsLoading(state),
    templateIsLoading: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_TEMPLATE
    ),
    selectedJobIsLoading: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_FILE_METADATA_FOR_JOB
    ),
    massEditRow: getMassEditRow(state),
    savedTemplateId: getTemplateId(state),
    selectedBarcode: getSelectedBarcode(state),
    selectedJob: getSelectedJob(state),
    showUploadHint: getShowUploadHint(state),
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
  associateByWorkflow,
  closeUpload,
  createBarcode,
  initiateUpload,
  jumpToUpload,
  loadFilesFromDragAndDrop,
  openFilesFromDialog,
  removeUploads,
  selectBarcode,
  setAlert,
  submitFileMetadataUpdate,
  toggleRowExpanded: toggleExpandedUploadJobRow,
  updateAndRetryUpload,
  updateMassEditRow,
  updateSettings,
  updateSubImages,
  updateUpload,
  updateUploadRows,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
