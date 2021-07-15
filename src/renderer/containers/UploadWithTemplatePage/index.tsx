import { Alert, Spin } from "antd";
import { OpenDialogOptions } from "electron";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import DragAndDrop from "../../components/DragAndDrop";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import {
  getIsLoading,
  getRequestsInProgress,
  getUploadError,
} from "../../state/feedback/selectors";
import { loadFiles } from "../../state/selection/actions";
import {
  getAreSelectedUploadsInFlight,
  getSelectedUploads,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AsyncRequest } from "../../state/types";
import { applyTemplate } from "../../state/upload/actions";
import {
  getUploadAsTableRows,
  getUploadValidationErrors,
} from "../../state/upload/selectors";
import CustomDataTable from "../CustomDataTable";

import PageFooter from "./PageFooter";

const styles = require("./styles.pcss");

const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "multiSelections"],
  title: "Browse for files, or drag and drop files/folders onto app",
};

/**
 * TODO
 */
export default function UploadWithTemplatePage() {
  const dispatch = useDispatch();
  const appliedTemplate = useSelector(getAppliedTemplate);
  const isReadOnly = useSelector(getAreSelectedUploadsInFlight);
  const isPageLoading = useSelector(getIsLoading);
  const requestsInProgress = useSelector(getRequestsInProgress);
  const selectedUploads = useSelector(getSelectedUploads);
  const uploadError = useSelector(getUploadError);
  const uploads = useSelector(getUploadAsTableRows);
  const validationErrors = useSelector(getUploadValidationErrors);

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);

  const isTemplateLoading = requestsInProgress.includes(
    AsyncRequest.GET_TEMPLATE
  );
  const isSelectedJobLoading = requestsInProgress.includes(
    AsyncRequest.GET_FILE_METADATA_FOR_JOB
  );

  return (
    <DragAndDrop
      disabled={!!selectedUploads.length}
      overlayChildren={!Object.keys(uploads).length && !isPageLoading}
      onDrop={(f) => dispatch(loadFiles(f))}
      openDialogOptions={openDialogOptions}
    >
      <div className={styles.contentContainer}>
        {!isSelectedJobLoading && (
          <>
            {hasAttemptedSubmit && !appliedTemplate && (
              <Alert
                className={styles.alert}
                message="Please select a template."
                type="error"
                showIcon={true}
                key="template-not-selected"
              />
            )}
            <LabeledInput
              className={styles.selector}
              label={`Select ${SCHEMA_SYNONYM}`}
            >
              <TemplateSearch
                allowCreate={true}
                disabled={isTemplateLoading || isReadOnly}
                error={hasAttemptedSubmit && !appliedTemplate}
                value={appliedTemplate?.templateId}
                onSelect={(t) => dispatch(applyTemplate(t))}
              />
            </LabeledInput>
          </>
        )}
        {isTemplateLoading || isSelectedJobLoading ? (
          <div className={styles.spinContainer}>
            <div>Loading...</div>
            <Spin />
          </div>
        ) : (
          <>
            {hasAttemptedSubmit && !!validationErrors.length && (
              <Alert
                className={styles.alert}
                message={validationErrors.map((e) => (
                  <div key={e}>{e}</div>
                ))}
                showIcon={true}
                type="error"
                key="validation-errors"
              />
            )}
            <CustomDataTable hasSubmitBeenAttempted={hasAttemptedSubmit} />
            {uploadError && (
              <Alert
                className={styles.alert}
                message="Upload Failed"
                description={uploadError}
                type="error"
                showIcon={true}
                key="upload-failed"
              />
            )}
          </>
        )}
      </div>
      <PageFooter onSubmit={() => setHasAttemptedSubmit(true)} />
    </DragAndDrop>
  );
}
