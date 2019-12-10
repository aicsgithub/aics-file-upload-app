import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Button, Descriptions } from "antd";
import * as React from "react";

import { FAILED_STATUS } from "../../state/constants";

const Item = Descriptions.Item;

const styles = require("./styles.pcss");

interface Props {
    allowCancel: boolean;
    cancelUpload: () => void;
    className?: string;
    job: JSSJob;
    loading: boolean;
    retryUpload: () => void;
}

const JobOverviewDisplay: React.FunctionComponent<Props> = ({
                                                                allowCancel,
                                                                cancelUpload,
                                                                className,
                                                                job,
                                                                loading,
                                                                retryUpload}: Props) => {
    const {
        created,
        jobId,
        status,
        user,
    } = job;
    let extraStatusActionButton: JSX.Element | undefined;
    if (allowCancel) {
        extraStatusActionButton = (
            <Button
                className={styles.actionButton}
                type="danger"
                loading={loading}
                disabled={loading}
                onClick={cancelUpload}
            >
                Cancel
            </Button>
        );
    } else if (status === FAILED_STATUS) {
        extraStatusActionButton = (
            <Button
                className={styles.actionButton}
                type="primary"
                loading={loading}
                disabled={loading}
                onClick={retryUpload}
            >
                Retry
            </Button>
        );
    }
    return (
        <Descriptions
            className={className}
            size="small"
            title={<div>Job Overview {extraStatusActionButton}</div>}
            column={{ xxl: 3, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
        >
            <Item label="Job Id">{jobId}</Item>
            <Item label="Created">{created.toLocaleString()}</Item>
            <Item label="Created By">{user}</Item>
        </Descriptions>
    );
};

export default JobOverviewDisplay;
