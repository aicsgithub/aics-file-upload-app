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
import { getUploadsByTemplateUsage } from "../../state/job/selectors";
import { startNewUpload, viewUploads } from "../../state/route/actions";
import { AsyncRequest } from "../../state/types";
import { cancelUploads, retryUploads } from "../../state/upload/actions";
import UploadTable from "./UploadTable";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
}

function getContextMenuItems(dispatch: Dispatch, selectedUploadKeys: string[]) {
  return remote.Menu.buildFromTemplate([
    {
      label: "View",
      click: () => {
        dispatch(viewUploads(selectedUploadKeys));
      },
    },
    {
      label: "Retry",
      enabled: selectedUploadKeys.every((r) =>
        FAILED_STATUSES.includes(r.status)
      ),
      click: () => {
        dispatch(retryUploads(selectedUploadKeys));
      },
    },
    {
      label: "Cancel",
      enabled: selectedUploads.some((r) =>
        IN_PROGRESS_STATUSES.includes(r.status)
      ),
      click: () => {
        dispatch(cancelUploads(selectedUploadKeys));
      },
    },
  ]);
}

export default function UploadSummary(props: Props) {
  const dispatch = useDispatch();
  const { uploadsWithTemplates, uploadsWithoutTemplates } = useSelector(
    getUploadsByTemplateUsage
  );
  const requestsInProgress = useSelector(getRequestsInProgress);
  const isRequestingJobs = requestsInProgress.includes(AsyncRequest.GET_JOBS);

  const [selectedUploadKeys, setSelectedUploadKeys] = React.useState<string[]>(
    []
  );

  const [
    selectedAllFailedUploads,
    selectedAllInProgressUploads,
  ] = React.useMemo(() => {
    return [false, false];
    // const uploadJobIdSet = new Set(selectedUploadKeys);
    // const selectedUploads = [...uploadsWithTemplates, ...uploadsWithoutTemplates].filter(upload => (
    //   uploadJobIdSet.has(upload.jobId)
    // ));
    // const selectedAllFailedUploads = selectedUploads.every(upload => (
    //   upload.status === JSSJobStatus.FAILED
    // ));
    // let selectedAllInProgressUploads = false;
    // if (!selectedAllFailedUploads) {
    //   selectedAllInProgressUploads = selectedUploads.every(upload => (
    //     IN_PROGRESS_STATUSES.includes(upload.status)
    //   ));
    // }
    // return [selectedAllFailedUploads, selectedAllInProgressUploads];
  }, [selectedUploadKeys, uploadsWithTemplates, uploadsWithoutTemplates]);

  return (
    <div className={classNames(styles.container, props.className)}>
      <div className={styles.header}>
        <h2>My Uploads</h2>
        <div className={styles.tableToolBar}>
          <div>
            <Tooltip title="View Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={() => dispatch(viewUploads(selectedUploadKeys))}
                disabled={isEmpty(selectedUploadKeys)}
                icon="file-search"
              >
                View
              </Button>
            </Tooltip>
            <Tooltip title="Retry Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={() => dispatch(retryUploads(selectedUploadKeys))}
                disabled={
                  isEmpty(selectedUploadKeys) || !selectedAllFailedUploads
                }
                icon="redo"
              >
                Retry
              </Button>
            </Tooltip>
            <Tooltip title="Cancel Selected Uploads" mouseLeaveDelay={0}>
              <Button
                className={styles.tableToolBarButton}
                onClick={() => dispatch(cancelUploads(selectedUploadKeys))}
                disabled={
                  isEmpty(selectedUploadKeys) || !selectedAllInProgressUploads
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
        <UploadTable
          isLoading={isRequestingJobs}
          title="Uploads Without Metadata Templates"
          uploads={uploadsWithoutTemplates}
          setSelectedUploadKeys={setSelectedUploadKeys}
          onContextMenu={() =>
            getContextMenuItems(dispatch, selectedUploadKeys).popup()
          }
        />
        <UploadTable
          isLoading={isRequestingJobs}
          title="Uploads With Metadata Templates"
          uploads={uploadsWithTemplates}
          setSelectedUploadKeys={setSelectedUploadKeys}
          onContextMenu={() =>
            getContextMenuItems(dispatch, selectedUploadKeys).popup()
          }
        />
      </div>
    </div>
  );
}
