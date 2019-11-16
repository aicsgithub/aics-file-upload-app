import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Button, Descriptions } from "antd";
import * as React from "react";

import { FAILED_STATUS } from "../../state/constants";

const Item = Descriptions.Item;

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
        currentStage,
        currentHost,
        jobId,
        jobName,
        modified,
        originationHost,
        status,
        user,
    } = job;
    let extraStatusActionButton: JSX.Element | undefined;
    if (allowCancel) {
        extraStatusActionButton = (
            <Button onClick={cancelUpload} type="danger" disabled={loading} loading={loading}>
                Cancel
            </Button>
        );
    } else if (status === FAILED_STATUS) {
        extraStatusActionButton = (
            <Button onClick={retryUpload} type="primary" disabled={loading} loading={loading}>
                Retry
            </Button>
        );
    }
    return (
        <Descriptions
            className={className}
            size="small"
            title="Job Overview"
            column={{ xxl: 3, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
        >
            <Item label="Job Id">{jobId}</Item>
            <Item label="Job Name">{jobName}</Item>
            <Item label="Status">{status} {extraStatusActionButton}</Item>
            <Item label="Created">{created.toLocaleString()}</Item>
            <Item label="Created By">{user}</Item>
            <Item label="Origination Host">{originationHost}</Item>
            <Item label="Current Host">{currentHost}</Item>
            <Item label="Modified">{modified.toLocaleString()}</Item>
            <Item label="Current Stage">{currentStage}</Item>
        </Descriptions>
    );
};

export default JobOverviewDisplay;
