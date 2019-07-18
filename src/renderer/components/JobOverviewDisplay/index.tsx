import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Descriptions } from "antd";
import * as React from "react";

const Item = Descriptions.Item;

interface Props {
    className?: string;
    job: JSSJob;
}

const JobOverviewDisplay: React.FunctionComponent<Props> = ({className, job}: Props) => {
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
    return (
        <Descriptions
            className={className}
            size="small"
            title="Job Overview"
            bordered={false}
            column={{ xxl: 3, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
        >
            <Item label="Job Id">{jobId}</Item>
            <Item label="Job Name">{jobName}</Item>
            <Item label="Status">{status}</Item>
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
