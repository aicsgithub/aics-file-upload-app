import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Collapse, Descriptions } from "antd";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { decamelizeKeys } from "humps";
import { isEmpty, map } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import JobOverviewDisplay from "../JobOverviewDisplay";

const styles = require("./styles.pcss");

const Item = Descriptions.Item;
const SEPARATOR = { separator: " "};

interface MetadataDisplayProps {
    title: string;
    metadata: any;
}
const MetadataDisplay: React.FunctionComponent<MetadataDisplayProps> = ({metadata, title}: MetadataDisplayProps) => {
    metadata = decamelizeKeys(metadata, SEPARATOR);
    title = `${title} Metadata`;
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
        serviceFields,
    } = job;
    const showFiles = serviceFields && serviceFields.files && Array.isArray(serviceFields.files)
        && !isEmpty(serviceFields.files);

    return (
        <div className={className}>
            <JobOverviewDisplay job={job}/>

            {showFiles && (
                <>
                    <div className="ant-descriptions-title">Files</div>
                    <Collapse className={styles.files}>
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
