import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { Descriptions } from "antd";
import * as React from "react";

const Item = Descriptions.Item;

interface Props {
  className?: string;
  job: JSSJob;
}

const JobOverviewDisplay: React.FunctionComponent<Props> = ({
  className,
  job,
}: Props) => {
  const { created, jobId, user } = job;
  return (
    <Descriptions
      className={className}
      size="small"
      title={<div>Job Overview</div>}
      column={{ xxl: 3, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 }}
    >
      <Item label="Job Id">{jobId}</Item>
      <Item label="Created">{created.toLocaleString()}</Item>
      <Item label="Created By">{user}</Item>
    </Descriptions>
  );
};

export default JobOverviewDisplay;
