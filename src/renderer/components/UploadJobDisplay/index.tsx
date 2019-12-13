import { Alert, Empty, Table } from "antd";
import { ColumnProps } from "antd/es/table";
import { isEmpty, uniq } from "lodash";
import { basename } from "path";
import * as React from "react";

import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { IN_PROGRESS_STATUSES } from "../../state/constants";
import { SearchResultRow } from "../../state/metadata/types";
import { titleCase } from "../../util";

import JobOverviewDisplay from "../JobOverviewDisplay";

const styles = require("./styles.pcss");

interface UploadJobDisplayProps {
    className?: string;
    cancelUpload: () => void;
    job: UploadSummaryTableRow;
    loading: boolean;
    retryUpload: () => void;
    fileMetadataForJob?: SearchResultRow[];
    fileMetadataForJobHeader?: Array<ColumnProps<SearchResultRow>>;
    fileMetadataForJobLoading: boolean;
    onFileRowClick: (row: SearchResultRow) => void;
}

const determineError = (error: string): string => {
    if (error.toLowerCase().includes("chmod")) {
        return `Error while uploading, you and/or FMS did not have permission to read one of these files.
                The full error was: ${error}`;
    }
    return error;
};

const UploadJobDisplay: React.FunctionComponent<UploadJobDisplayProps> = ({
                                                                              cancelUpload,
                                                                              className,
                                                                              job,
                                                                              loading,
                                                                              retryUpload,
                                                                              fileMetadataForJob,
                                                                              fileMetadataForJobHeader,
                                                                              fileMetadataForJobLoading,
                                                                              onFileRowClick,
                                                                          }: UploadJobDisplayProps) => {
    const alerts: JSX.Element[] = [];
    const allowCancel = IN_PROGRESS_STATUSES.includes(job.status);
    if (allowCancel) {
        alerts.push(
            <Alert
                className={styles.alert}
                type="warning"
                message="Warning"
                key="cancellationAlert"
                description="Cancelling will make this upload unrecoverable"
                showIcon={true}
            />);
    }
    if (job.serviceFields && job.serviceFields.error) {
        alerts.push(
            <Alert
                className={styles.alert}
                type="error"
                message="Error"
                key="errorAlert"
                description={determineError(job.serviceFields.error)}
                showIcon={true}
            />
        );
    }
    let fileMetadata;
    if (fileMetadataForJob || fileMetadataForJobLoading) {
        const fileCount = fileMetadataForJob &&
            uniq(fileMetadataForJob.map((metadata) => metadata.fileId)).length;
        const tableTitle = () => fileMetadataForJobLoading ? (
            "...Loading File Metadata"
        ) : (
            `${fileCount} ${fileCount === 1 ? "File Was" : "Files Were"} Part Of This Job`
        );
        const onRow = (record: SearchResultRow) => ({ onClick: () => onFileRowClick(record) });
        fileMetadata = (
            <Table
                dataSource={fileMetadataForJob}
                columns={fileMetadataForJobHeader}
                loading={fileMetadataForJobLoading}
                title={tableTitle}
                onRow={onRow}
            />
        );
    } else if (job.serviceFields
        && job.serviceFields.files
        && !isEmpty(job.serviceFields.files)
        && job.serviceFields.files[0].file
        && job.serviceFields.files[0].file.originalPath) {
        alerts.push(
            <Alert
                className={styles.alert}
                type="warning"
                message="Warning"
                key="failedFindingMetadataAlert"
                description="This job has incomplete metadata, unable to display file metadata below"
                showIcon={true}
            />);
        const rows = job.serviceFields.files.map((file: { file: { originalPath: string } }) => {
            const { originalPath } = file.file;
            const filename = basename(originalPath);
            return { filename, originalPath, key: originalPath };
        });
        const tableTitle = () => "Incomplete File Information Retrieved From Job";
        fileMetadata = (
            <Table
                dataSource={rows}
                columns={["filename", "originalPath"].map((column) =>
                    ({ dataIndex: column, title: titleCase(column) })
                )}
                title={tableTitle}
            />
        );
    } else {
        fileMetadata = <Empty description={"Unable to determine files for this job"} />;
    }
    return (
        <div className={className}>
            {alerts}
            <JobOverviewDisplay
                allowCancel={allowCancel}
                cancelUpload={cancelUpload}
                job={job}
                loading={loading}
                retryUpload={retryUpload}
            />
            <div className="ant-descriptions-title">Files</div>
            {fileMetadata}
        </div>
    );
};

export default UploadJobDisplay;
