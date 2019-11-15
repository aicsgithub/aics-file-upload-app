import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Alert, Collapse, Descriptions } from "antd";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { get, isEmpty } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { IN_PROGRESS_STATUSES } from "../../state/constants";
import JobOverviewDisplay from "../JobOverviewDisplay";

const Item = Descriptions.Item;
const styles = require("./styles.pcss");

interface UploadJobDisplayProps {
    className?: string;
    cancelUpload: () => void;
    job: UploadSummaryTableRow;
    loading: boolean;
    retryUpload: () => void;
}

interface ResultFile {
    fileName: string;
    fileId: string;
    readPath: string;
}

const UploadJobDisplay: React.FunctionComponent<UploadJobDisplayProps> = ({
                                                                              cancelUpload,
                                                                              className,
                                                                              job,
                                                                              loading,
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
    const allowCancel = IN_PROGRESS_STATUSES.includes(job.status);

    const error = job.serviceFields && job.serviceFields.error && (
        <Alert type="error" message="Error" description={job.serviceFields.error} showIcon={true}/>
    );
    return (
        <div className={className}>
            {error}
            {allowCancel && <Alert closable={true} type="warning" message="Cancelling will make this upload unrecoverable" />}
            <JobOverviewDisplay
                allowCancel={allowCancel}
                cancelUpload={cancelUpload}
                job={job}
                loading={loading}
                retryUpload={retryUpload}
            />

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
