import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Collapse, Descriptions } from "antd";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { decamelizeKeys} from "humps";
import { isEmpty, map } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

const Item = Descriptions.Item;
const SEPARATOR = { separator: " "};

interface MetadataDisplayProps {
    title: string;
    metadata: any;
}
const MetadataDisplay: React.FunctionComponent<MetadataDisplayProps> = ({metadata, title}: MetadataDisplayProps) => {
    metadata = decamelizeKeys(metadata, SEPARATOR);
    title = `${title.charAt(0).toUpperCase()}${title.slice(1)} Metadata`;
    return (
        <Descriptions
            size="small"
            title={title}
            column={{xs: 1}}
            bordered={false}
        >
            {map(metadata, (value: any, key: string) => {
                if (typeof value === "object") {
                    if (Array.isArray(value)) {
                        return <Item label={key} key={key}>{value.join(", ")}</Item>;
                    }
                    return <MetadataDisplay title={key} metadata={value} key={key}/>;
                }

                return <Item label={key} key={key}>{value}</Item>;
            })}
        </Descriptions>
    );
};

interface UploadJobDisplayProps {
    className?: string;
    job: UploadSummaryTableRow;
}

const UploadJobDisplay: React.FunctionComponent<UploadJobDisplayProps> = ({className, job}: UploadJobDisplayProps) => {
    const {
        created,
        currentStage,
        currentHost,
        jobId,
        jobName,
        modified,
        originationHost,
        serviceFields,
        status,
        user,
    } = job;
    const showFiles = serviceFields && serviceFields.files && Array.isArray(serviceFields.files)
        && !isEmpty(serviceFields.files);

    return (
        <div className={className}>
            <Descriptions
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

            {showFiles && (
                <>
                    <div className="ant-descriptions-title">Files</div>
                    <Collapse>
                        {serviceFields.files.map((f: UploadMetadata) => {
                            if (!f.file.originalPath) {
                                return null;
                            }

                            return (
                                <CollapsePanel header={f.file.originalPath} key={f.file.originalPath}>

                                    {map(f, (value: any, metadataGroupName: string) => (
                                        <MetadataDisplay
                                            metadata={value}
                                            title={metadataGroupName}
                                            key={metadataGroupName}
                                        />
                                    ))}
                                </CollapsePanel>
                            );
                        })}
                    </Collapse>
                </>
            )}
        </div>
    );
};

export default UploadJobDisplay;
