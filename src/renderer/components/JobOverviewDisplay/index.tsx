import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Button, Descriptions } from "antd";
import * as React from "react";

import { FAILED_STATUS, IN_PROGRESS_STATUSES } from "../../state/constants";

const Item = Descriptions.Item;

interface Props {
    cancelUpload: () => void;
    className?: string;
    job: JSSJob;
    loading: boolean;
    retryUpload: () => void;
}

const JobOverviewDisplay: React.FunctionComponent<Props> = ({
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
    if (status === FAILED_STATUS) {
        extraStatusActionButton = (
            <Button onClick={retryUpload} type="primary" loading={loading}>
                Retry
            </Button>
        );
    } else if (IN_PROGRESS_STATUSES.includes(status)) {
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        // Only allow cancelling jobs that have been going on for > 5 minutes to avoid possible funkiness
        if (fiveMinutesAgo > modified) {
            extraStatusActionButton = (
                <Button onClick={cancelUpload} type="danger" loading={loading}>
                    Cancel
                </Button>
            );
        }
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
