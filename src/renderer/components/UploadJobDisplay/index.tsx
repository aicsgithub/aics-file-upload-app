import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Collapse, Descriptions } from "antd";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { isEmpty, map } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";

const Item = Descriptions.Item;
// const styles = require("./styles.pcss");

interface MetadataDisplayProps {
    title: string;
    metadata: any;
}
const MetadataDisplay: React.FunctionComponent<MetadataDisplayProps> = ({metadata, title}: MetadataDisplayProps) => (
    <Descriptions
        title={title}
        column={{xs: 1}}
        bordered={true}
    >
        {map(metadata, (value: any, key: string) => {
            if (typeof value === "object") {
                if (Array.isArray(value)) {
                    return <Item label={key}>{value.join(", ")}</Item>;
                }
                return <MetadataDisplay title={key} metadata={value}/>;
            }

            return <Item label={key}>{value}</Item>;
        })}
    </Descriptions>
);

interface FileDisplayProps {
    key: string;
    metadata: UploadMetadata;

    //     {
    //     file: {
    //         fileType: string;
    //         originalPath: string;
    //     },
    //     microscopy: {
    //         wellIds: number[];
    //     }
    // };
}

const FileDisplay: React.FunctionComponent<FileDisplayProps> = ({ key, metadata }: FileDisplayProps) => (
    <CollapsePanel header={metadata.file.originalPath} key={key}>
        <h2>{metadata.file.originalPath}</h2>
        {map(metadata, (value: any, metadataGroupName: string) => (
            <MetadataDisplay metadata={value} title={metadataGroupName} key={metadataGroupName}/>
        ))}
    </CollapsePanel>
);

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
    const showFiles = serviceFields && serviceFields.files && Array.isArray(serviceFields.files) && !isEmpty(serviceFields.files);
    return (
        <div className={className}>
            <Descriptions
                title="Job Overview"
                bordered={true}
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
                <Collapse>
                    {serviceFields.files.map((f: UploadMetadata, i: number) => {
                        if (!f.file.originalPath) {
                            return null;
                        }

                        return (
                            <FileDisplay key={f.file.originalPath} metadata={f}/>
                        );
                    })}
                </Collapse>
            )}
        </div>
    );
};

export default UploadJobDisplay;
