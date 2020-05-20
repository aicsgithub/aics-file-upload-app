import { Alert, Spin } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import CustomDataGrid from "../../components/CustomDataGrid";
import FormPage from "../../components/FormPage";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { setAlert } from "../../state/feedback/actions";
import {
  getRequestsInProgressContains,
  getUploadError,
} from "../../state/feedback/selectors";
import { AsyncRequest, SetAlertAction } from "../../state/feedback/types";
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
  selectBarcode,
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
import { updateSettings } from "../../state/setting/actions";
import {
  getShowUploadHint,
  getTemplateId,
} from "../../state/setting/selectors";
import { UpdateSettingsAction } from "../../state/setting/types";
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
  UpdateSubImagesAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UploadJobTableRow,
} from "../../state/upload/types";
import { LabkeyTemplate } from "../../util/labkey-client/types";
import BarcodeSearch from "../BarcodeSearch";

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
  expandedRows: ExpandedRows;
  fileToAnnotationHasValueMap: { [file: string]: { [key: string]: boolean } };
  goBack: ActionCreator<GoBackAction>;
  initiateUpload: ActionCreator<InitiateUploadAction>;
  jumpToUpload: ActionCreator<JumpToUploadAction>;
  loading: boolean;
  removeUploads: ActionCreator<RemoveUploadsAction>;
  savedTemplateId?: number;
  selectBarcode: typeof selectBarcode;
  selectedBarcode?: string;
  setAlert: ActionCreator<SetAlertAction>;
  showUploadHint: boolean;
  templates: LabkeyTemplate[];
  toggleRowExpanded: ActionCreator<ToggleExpandedUploadJobRowAction>;
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
      canUndo,
      className,
      loading,
      showUploadHint,
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
            <div className={styles.spinText}>Getting template details...</div>
            <Spin />
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
            message={validationErrors.map((e) => (
              <div key={e}>{e}</div>
            ))}
            showIcon={true}
            type="error"
          />
        )}
        {!loading && appliedTemplate && showUploadHint && (
          <Alert
            afterClose={this.hideHint}
            className={styles.alert}
            closable={true}
            message="Hint: You can add multiple values for Text and Number annotations using commas!"
            showIcon={true}
            type="info"
          />
        )}
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
            updateUploadRows={this.props.updateUploadRows}
            uploads={uploads}
            validationErrors={uploadRowKeyToAnnotationErrorMap}
          />
        )}
      </FormPage>
    );
  }

  private renderButtons = () => {
    const { appliedTemplate, selectedBarcode } = this.props;

    return (
      <div className={styles.selectors}>
        <LabeledInput
          className={styles.schemaSelector}
          label={`Select a ${SCHEMA_SYNONYM}`}
        >
          <TemplateSearch
            allowCreate={true}
            className={styles.schemaSelector}
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

  private upload = (): void => {
    this.props.initiateUpload();
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
    booleanAnnotationTypeId: getBooleanAnnotationTypeId(state),
    canRedo: getCanRedoUpload(state),
    canUndo: getCanUndoUpload(state),
    channels: getChannels(state),
    expandedRows: getExpandedUploadJobRows(state),
    fileToAnnotationHasValueMap: getFileToAnnotationHasValueMap(state),
    loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
    savedTemplateId: getTemplateId(state),
    selectedBarcode: getSelectedBarcode(state),
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
  goBack,
  initiateUpload,
  jumpToUpload,
  removeUploads,
  selectBarcode,
  setAlert,
  toggleRowExpanded: toggleExpandedUploadJobRow,
  updateSettings,
  updateSubImages,
  updateUpload,
  updateUploadRows,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AddCustomData);
