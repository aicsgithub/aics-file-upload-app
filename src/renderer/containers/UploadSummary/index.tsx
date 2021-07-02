import { Button, Spin, Tooltip } from "antd";
import { remote } from "electron";
import { isEmpty, uniqBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row } from "react-table";

import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
} from "../../services/job-status-client/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getUploadsByTemplateUsage } from "../../state/job/selectors";
import { startNewUpload, viewUploads } from "../../state/route/actions";
import { AsyncRequest, UploadSummaryTableRow } from "../../state/types";
import { cancelUploads, retryUploads } from "../../state/upload/actions";
import UploadTable from "../UploadTable";

const styles = require("./styles.pcss");

export default function UploadSummary() {
  const dispatch = useDispatch();
  const { uploadsWithTemplates, uploadsWithoutTemplates } = useSelector(
    getUploadsByTemplateUsage
  );
  const requestsInProgress = useSelector(getRequestsInProgress);
  const isRequestingJobs = requestsInProgress.includes(AsyncRequest.GET_JOBS);

  const [selectedUploads, setSelectedUploads] = React.useState<
    UploadSummaryTableRow[]
  >([]);

  const [
    areSelectedUploadsAllFailed,
    areSelectedUploadsAllInProgress,
  ] = React.useMemo(() => {
    const selectedAllFailedUploads = selectedUploads.every(
      (upload) => upload.status === JSSJobStatus.FAILED
    );
    let selectedAllInProgressUploads = false;
    if (!selectedAllFailedUploads) {
      selectedAllInProgressUploads = selectedUploads.every((upload) =>
        IN_PROGRESS_STATUSES.includes(upload.status)
      );
    }
    return [selectedAllFailedUploads, selectedAllInProgressUploads];
  }, [selectedUploads]);

  function onSelect(
    rows: Row<UploadSummaryTableRow>[],
    isDeselecting: boolean
  ) {
    if (isDeselecting) {
      const rowIds = new Set(rows.map((r) => r.id));
      setSelectedUploads(selectedUploads.filter((u) => !rowIds.has(u.jobId)));
    } else {
      const uploads = rows.map((r) => r.original);
      setSelectedUploads(uniqBy([...selectedUploads, ...uploads], "jobId"));
    }
  }

  function onView() {
    dispatch(viewUploads(selectedUploads));
    setSelectedUploads([]);
  }

  function onRetry() {
    dispatch(retryUploads(selectedUploads));
    setSelectedUploads([]);
  }

  function onCancel() {
    dispatch(cancelUploads(selectedUploads));
    setSelectedUploads([]);
  }

  function onContextMenu() {
    remote.Menu.buildFromTemplate([
      {
        label: "View",
        enabled: !!selectedUploads.length,
        click: onView,
      },
      {
        label: "Retry",
        enabled: !!selectedUploads.length && areSelectedUploadsAllFailed,
        click: onRetry,
      },
      {
        label: "Cancel",
        enabled: !!selectedUploads.length && areSelectedUploadsAllInProgress,
        click: onCancel,
      },
    ]).popup();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>My Uploads</h2>
        <div className={styles.tableToolBar}>
          <div>
            <Tooltip title="View Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={onView}
                disabled={isEmpty(selectedUploads)}
                icon="file-search"
              >
                View
              </Button>
            </Tooltip>
            <Tooltip title="Retry Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={onRetry}
                disabled={
                  isEmpty(selectedUploads) || !areSelectedUploadsAllFailed
                }
                icon="redo"
              >
                Retry
              </Button>
            </Tooltip>
            <Tooltip title="Cancel Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={onCancel}
                disabled={
                  isEmpty(selectedUploads) || !areSelectedUploadsAllInProgress
                }
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
        {isRequestingJobs ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {!!uploadsWithoutTemplates.length && (
              <UploadTable
                title="Uploads Missing Metadata Templates"
                uploads={uploadsWithoutTemplates}
                onContextMenu={onContextMenu}
                onSelect={onSelect}
              />
            )}
            <UploadTable
              title="Uploads With Metadata Templates"
              uploads={uploadsWithTemplates}
              onContextMenu={onContextMenu}
              onSelect={onSelect}
            />
          </>
        )}
      </div>
    </div>
  );
}
