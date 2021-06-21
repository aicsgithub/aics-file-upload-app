import { Button, Tooltip } from "antd";
import * as classNames from "classnames";
import { remote } from "electron";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Dispatch } from "redux";

import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
} from "../../services/job-status-client/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getJobsByTemplateUsage } from "../../state/job/selectors";
import { startNewUpload, viewUploads } from "../../state/route/actions";
import { AsyncRequest, UploadSummaryTableRow } from "../../state/types";
import { cancelUploads, retryUploads } from "../../state/upload/actions";

import UploadTable from "./UploadTable";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
}

function getContextMenuItems(
  dispatch: Dispatch,
  selectedUploads: UploadSummaryTableRow[]
) {
  return remote.Menu.buildFromTemplate([
    {
      label: "View",
      click: () => {
        dispatch(viewUploads(selectedUploads));
      },
    },
    {
      label: "Retry",
      enabled: selectedUploads.some((r) => FAILED_STATUSES.includes(r.status)),
      click: () => {
        dispatch(retryUploads(selectedUploads));
      },
    },
    {
      label: "Cancel",
      enabled: selectedUploads.some((r) =>
        IN_PROGRESS_STATUSES.includes(r.status)
      ),
      click: () => {
        dispatch(cancelUploads(selectedUploads));
      },
    },
  ]);
}

export default function UploadSummary(props: Props) {
  const dispatch = useDispatch();
  const { jobsWithTemplates, jobsWithoutTemplates } = useSelector(
    getJobsByTemplateUsage
  );
  const requestsInProgress = useSelector(getRequestsInProgress);
  const isRequestingJobs = requestsInProgress.includes(AsyncRequest.GET_JOBS);

  const [selectedUploads, setSelectedUploads] = React.useState<
    UploadSummaryTableRow[]
  >([]);

  return (
    <div className={classNames(styles.container, props.className)}>
      <div className={styles.header}>
        <h2>My Uploads</h2>
        <div className={styles.tableToolBar}>
          <div>
            <Tooltip title="View Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={() => dispatch(viewUploads(selectedUploads))}
                disabled={isEmpty(selectedUploads)}
                icon="file-search"
              >
                View
              </Button>
            </Tooltip>
            <Tooltip title="Retry Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={() => dispatch(retryUploads(selectedUploads))}
                disabled={isEmpty(selectedUploads) || true}
                icon="redo"
              >
                Retry
              </Button>
            </Tooltip>
            <Tooltip title="Cancel Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={() => dispatch(cancelUploads(selectedUploads))}
                disabled={isEmpty(selectedUploads) || true}
                icon="stop"
              >
                Cancel
              </Button>
            </Tooltip>
          </div>
          <Button
            className={styles.newUploadButton}
            icon="plus"
            onClick={() => dispatch(startNewUpload())}
          >
            Upload
          </Button>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <UploadTable
          isLoading={isRequestingJobs}
          title="Uploads Without Metadata Templates"
          uploads={jobsWithoutTemplates}
          selectedUploads={selectedUploads}
          setSelectedUploads={setSelectedUploads}
          onContextMenu={() =>
            getContextMenuItems(dispatch, selectedUploads).popup()
          }
        />
        <UploadTable
          isLoading={isRequestingJobs}
          title="Uploads With Metadata Templates"
          uploads={jobsWithTemplates}
          selectedUploads={selectedUploads}
          setSelectedUploads={setSelectedUploads}
          onContextMenu={() =>
            getContextMenuItems(dispatch, selectedUploads).popup()
          }
        />
      </div>
    </div>
  );
}
