import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Alert, Collapse, Descriptions } from "antd";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { get, isEmpty, map } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import FileMetadataDisplay from "../FileMetadataDisplay";
import JobOverviewDisplay from "../JobOverviewDisplay";

const Item = Descriptions.Item;
const styles = require("./styles.pcss");

interface UploadJobDisplayProps {
    className?: string;
    job: UploadSummaryTableRow;
    retrying: boolean;
    retryUpload: () => void;
}

interface ResultFile {
    fileName: string;
    fileId: string;
    readPath: string;
}

const UploadJobDisplay: React.FunctionComponent<UploadJobDisplayProps> = ({
                                                                              className,
                                                                              job,
                                                                              retrying,
                                                                              retryUpload,
}: UploadJobDisplayProps) => {
    const { serviceFields } = job;
    const showFiles = serviceFields && serviceFields.files && Array.isArray(serviceFields.files)
        && !isEmpty(serviceFields.files);

    let files;

    if (showFiles) {
        files = serviceFields.files.map((file: UploadMetadata) => {
            const result = get(serviceFields, "result", [])
                .find((resultFile: ResultFile) => get(file, ["file", "originalPath"], "")
                    .endsWith(resultFile.fileName));
            return {
                metadata: file,
                result,
            };
        });
    }

    const error = job.serviceFields && job.serviceFields.error ? (
            <Alert type="error" message="Error" description={job.serviceFields.error} showIcon={true}/>
        ) : undefined;
    return (
        <div className={className}>
            {error}
            <JobOverviewDisplay job={job} retryUpload={retryUpload} retrying={retrying}/>

            {showFiles && (
                <>
                    <div className="ant-descriptions-title">Files</div>
                    <Collapse className={styles.files}>
                        {files.map(({metadata, result}: {metadata: UploadMetadata, result?: ResultFile}) => {
                            if (!metadata.file.originalPath) {
                                return null;
                            }

                            const header = result ? result.fileName : metadata.file.originalPath;
                            return (
                                <CollapsePanel header={header} key={header}>

                                    {map(metadata, (value: any, metadataGroupName: string) => (
                                        <FileMetadataDisplay
                                            metadata={value}
                                            title={metadataGroupName}
                                            key={metadataGroupName}
                                        />
                                    ))}
                                    {result && <Descriptions
                                        size="small"
                                        title="Upload Result"
                                        column={{xs: 1}}
                                    >
                                        <Item label="File Id">{result.fileId}</Item>
                                        <Item label="Location">{result.readPath}</Item>
                                    </Descriptions>}
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
