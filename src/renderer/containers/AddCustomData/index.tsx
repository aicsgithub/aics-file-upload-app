import { Alert, Button, Checkbox, Icon, Select, Spin, Form } from "antd";
import { CustomIconComponentProps } from "antd/lib/icon";
import classNames from "classnames";
import { ipcRenderer, OpenDialogOptions } from "electron";
import { find } from "lodash";
import * as React from "react";
import { ReactNodeArray } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { PLATE_CREATED, SCHEMA_SYNONYM } from "../../../shared/constants";
import DragAndDrop from "../../components/DragAndDrop";
import JobOverviewDisplay from "../../components/JobOverviewDisplay";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { UploadServiceFields } from "../../services/aicsfiles/util";
import { JSSJob, JSSJobStatus } from "../../services/job-status-client/types";
import {
  BarcodePrefix,
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
  getBarcodePrefixes,
  getBooleanAnnotationTypeId,
  getTemplates,
} from "../../state/metadata/selectors";
import { CreateBarcodeAction } from "../../state/metadata/types";
import { closeUpload } from "../../state/route/actions";
import { CloseUploadAction } from "../../state/route/types";
import {
  loadFilesFromDragAndDrop,
  openFilesFromDialog,
  selectBarcode,
  setHasNoPlateToUpload,
} from "../../state/selection/actions";
import {
  getSelectedBarcode,
  getSelectedJob,
  getHasNoPlateToUpload,
  getIsSelectedJobInFlight,
} from "../../state/selection/selectors";
import {
  LoadFilesFromDragAndDropAction,
  LoadFilesFromOpenDialogAction,
  SelectBarcodeAction,
  SetHasNoPlateToUploadAction,
} from "../../state/selection/types";
import { updateSettings } from "../../state/setting/actions";
import { UpdateSettingsAction } from "../../state/setting/types";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AsyncRequest, DragAndDropFileList, State } from "../../state/types";
import {
  applyTemplate,
  initiateUpload,
  removeUploads,
  submitFileMetadataUpdate,
  updateAndRetryUpload,
} from "../../state/upload/actions";
import {
  getFileToAnnotationHasValueMap,
  getUploadAsTableRows,
  getUploadValidationErrors,
} from "../../state/upload/selectors";
import {
  ApplyTemplateAction,
  InitiateUploadAction,
  RemoveUploadsAction,
  SubmitFileMetadataUpdateAction,
  UpdateAndRetryUploadAction,
  UploadJobTableRow,
} from "../../state/upload/types";
import BarcodeSearch from "../BarcodeSearch";
import CustomDataTable from "../CustomDataTable";

import { getCanSubmitUpload, getUploadInProgress } from "./selectors";

const styles = require("./style.pcss");

function createStepSvg(
  stepNum: number,
  displayName: string
): React.ComponentType<CustomIconComponentProps> {
  const componentFunc: React.ComponentType<CustomIconComponentProps> = () => (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor">
      <text
        x="510"
        y="555"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="600px"
        fontFamily="sans-serif"
      >
        {stepNum}
      </text>
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" />
    </svg>
  );
  // https://reactjs.org/docs/react-component.html#displayname
  componentFunc.displayName = displayName;
  return componentFunc;
}

const StepOneSvg = createStepSvg(1, "StepOneSvg");
const StepTwoSvg = createStepSvg(2, "StepTwoSvg");

interface Props {
  appliedTemplate?: Template;
  applyTemplate: ActionCreator<ApplyTemplateAction>;
  barcodePrefixes: BarcodePrefix[];
  booleanAnnotationTypeId?: number;
  canSubmit: boolean;
  closeUpload: ActionCreator<CloseUploadAction>;
  createBarcode: ActionCreator<CreateBarcodeAction>;
  fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } };
  hasNoPlateToUpload: boolean;
  isReadOnly: boolean;
  initiateUpload: ActionCreator<InitiateUploadAction>;
  loading: boolean;
  loadFilesFromDragAndDrop: (
    files: DragAndDropFileList
  ) => LoadFilesFromDragAndDropAction;
  openFilesFromDialog: (files: string[]) => LoadFilesFromOpenDialogAction;
  removeUploads: ActionCreator<RemoveUploadsAction>;
  selectBarcode: ActionCreator<SelectBarcodeAction>;
  selectedBarcode?: string;
  selectedJob?: JSSJob<UploadServiceFields>;
  selectedJobIsLoading: boolean;
  setAlert: ActionCreator<SetAlertAction>;
  setHasNoPlateToUpload: ActionCreator<SetHasNoPlateToUploadAction>;
  submitFileMetadataUpdate: ActionCreator<SubmitFileMetadataUpdateAction>;
  templateIsLoading: boolean;
  templates: LabkeyTemplate[];
  updateAndRetryUpload: ActionCreator<UpdateAndRetryUploadAction>;
  updateSettings: ActionCreator<UpdateSettingsAction>;
  uploadError?: string;
  uploadInProgress: boolean;
  uploads: UploadJobTableRow[];
  validationErrors: string[];
}

interface AddCustomDataState {
  selectedFiles: string[];
  submitAttempted: boolean;
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
      submitAttempted: false,
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

  public render() {
    const {
      canSubmit,
      loading,
      selectedJob,
      selectedJobIsLoading,
      templateIsLoading,
      uploadError,
      uploadInProgress,
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
        disabled={Boolean(selectedJob)}
        overlayChildren={!Object.keys(uploads).length && !loading}
        onDrop={this.props.loadFilesFromDragAndDrop}
        onOpen={this.props.openFilesFromDialog}
        openDialogOptions={openDialogOptions}
      >
        <div className={styles.contentRoot}>
          <div className={styles.contentAbs}>
            <div className={styles.contentContainer}>
              {selectedJob && <JobOverviewDisplay job={selectedJob} />}
              {!selectedJobIsLoading && this.renderTemplateAndUploadTypeInput()}
              {templateIsLoading || selectedJobIsLoading ? (
                <div className={styles.spinContainer}>
                  <div>Loading...</div>
                  <Spin />
                </div>
              ) : (
                <>
                  {this.renderValidationAlerts()}
                  <CustomDataTable
                    hasSubmitBeenAttempted={this.state.submitAttempted}
                  />
                  {uploadError && (
                    <Alert
                      className={styles.alert}
                      message="Upload Failed"
                      description={this.props.uploadError}
                      type="error"
                      showIcon={true}
                      key="upload-failed"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className={styles.saveButtonContainer}>
          <Button
            className={styles.cancelButton}
            size="large"
            onClick={() => this.props.closeUpload()}
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
      barcodePrefixes,
      createBarcode,
      isReadOnly,
      hasNoPlateToUpload,
      selectedBarcode,
      setHasNoPlateToUpload,
      templateIsLoading,
    } = this.props;
    const { submitAttempted } = this.state;
    const onCreateBarcode = (selectedPrefixId: any) => {
      createBarcode(
        find(barcodePrefixes, (prefix) => prefix.prefixId === selectedPrefixId)
      );
    };

    const templateError = submitAttempted && !appliedTemplate;
    const uploadTypeError =
      submitAttempted && !(selectedBarcode || hasNoPlateToUpload);

    return (
      <>
        {templateError && (
          <Alert
            className={styles.alert}
            message="Please select a template."
            type="error"
            showIcon={true}
            key="template-not-selected"
          />
        )}
        <div className={styles.stepContainer}>
          <div className={styles.stepIcon}>
            {appliedTemplate ? (
              <Icon
                type="check-circle"
                theme="filled"
                className={styles.stepIconComplete}
              />
            ) : (
              <Icon
                component={StepOneSvg}
                className={classNames({
                  [styles.stepIconError]: templateError,
                })}
              />
            )}
          </div>
          <div className={styles.stepForm}>
            <LabeledInput
              className={styles.selector}
              label={`Select ${SCHEMA_SYNONYM}`}
            >
              <TemplateSearch
                allowCreate={true}
                disabled={templateIsLoading || isReadOnly}
                error={templateError}
                value={appliedTemplate?.templateId}
                onSelect={this.props.applyTemplate}
              />
            </LabeledInput>
          </div>
        </div>
        {uploadTypeError && (
          <Alert
            className={styles.alert}
            message='Please select or create a barcode, or select "No Plate".'
            type="error"
            showIcon={true}
            key="upload-type-not-selected"
          />
        )}
        <div className={styles.stepContainer}>
          <div className={styles.stepIcon}>
            {selectedBarcode || hasNoPlateToUpload ? (
              <Icon
                type="check-circle"
                theme="filled"
                className={styles.stepIconComplete}
              />
            ) : (
              <Icon
                component={StepTwoSvg}
                className={classNames({
                  [styles.stepIconError]: uploadTypeError,
                })}
              />
            )}
          </div>
          <div className={styles.stepForm}>
            <div className={styles.barcodeFormContainer}>
              <LabeledInput
                className={styles.selector}
                label="Select Pre-Existing Barcode"
              >
                <BarcodeSearch
                  barcode={selectedBarcode}
                  disabled={isReadOnly}
                  error={uploadTypeError}
                  onBarcodeChange={(imagingSessionIds, barcode) => {
                    if (barcode) {
                      this.props.selectBarcode(barcode, imagingSessionIds);
                    }
                  }}
                />
              </LabeledInput>
              <div className={styles.separatorText}>OR</div>
              <LabeledInput
                className={styles.selector}
                label="Create Barcode & Plate"
              >
                <Form.Item validateStatus={uploadTypeError ? "error" : ""}>
                  <Select
                    className={styles.selector}
                    disabled={isReadOnly}
                    onSelect={onCreateBarcode}
                    placeholder="Select Barcode Prefix"
                  >
                    {barcodePrefixes.map(({ prefixId, description }) => (
                      <Select.Option value={prefixId} key={prefixId}>
                        {description}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </LabeledInput>
              <div className={styles.separatorText}>OR</div>
              <LabeledInput className={styles.selector} label="Neither">
                <Checkbox
                  className={classNames({
                    [styles.noPlateCheckboxError]: uploadTypeError,
                  })}
                  disabled={isReadOnly}
                  checked={hasNoPlateToUpload && !isReadOnly}
                  onClick={() => setHasNoPlateToUpload(!hasNoPlateToUpload)}
                />
                <span className={styles.helpText}>&nbsp;No Plate</span>
              </LabeledInput>
            </div>
          </div>
        </div>
      </>
    );
  };

  private renderValidationAlerts = (): ReactNodeArray => {
    const alerts: ReactNodeArray = [];
    if (!Object.keys(this.props.uploads).length) {
      return alerts;
    }
    if (this.state.submitAttempted && this.props.validationErrors.length > 0) {
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
    return alerts;
  };

  private submit = (): void => {
    const {
      validationErrors,
      selectedBarcode,
      hasNoPlateToUpload,
      selectedJob,
      submitFileMetadataUpdate,
      updateAndRetryUpload,
      initiateUpload,
    } = this.props;

    this.setState({ submitAttempted: true });

    if (
      validationErrors.length === 0 &&
      (selectedBarcode || hasNoPlateToUpload)
    ) {
      if (selectedJob) {
        if (selectedJob.status === JSSJobStatus.SUCCEEDED) {
          submitFileMetadataUpdate();
        }
        if (selectedJob.status === JSSJobStatus.FAILED) {
          updateAndRetryUpload();
        }
      } else {
        initiateUpload();
      }
    }
  };
}

function mapStateToProps(state: State) {
  return {
    appliedTemplate: getAppliedTemplate(state),
    barcodePrefixes: getBarcodePrefixes(state),
    booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
    canSubmit: getCanSubmitUpload(state),
    fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
    isReadOnly: getIsSelectedJobInFlight(state),
    hasNoPlateToUpload: getHasNoPlateToUpload(state),
    loading: getIsLoading(state),
    templateIsLoading: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_TEMPLATE
    ),
    selectedJobIsLoading: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_FILE_METADATA_FOR_JOB
    ),
    selectedBarcode: getSelectedBarcode(state),
    selectedJob: getSelectedJob(state),
    templates: getTemplates(state),
    uploadError: getUploadError(state),
    uploadInProgress: getUploadInProgress(state),
    uploads: getUploadAsTableRows(state),
    validationErrors: getUploadValidationErrors(state),
  };
}

const dispatchToPropsMap = {
  applyTemplate,
  closeUpload,
  createBarcode,
  initiateUpload,
  loadFilesFromDragAndDrop,
  openFilesFromDialog,
  removeUploads,
  selectBarcode,
  setAlert,
  setHasNoPlateToUpload,
  submitFileMetadataUpdate,
  updateAndRetryUpload,
  updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
