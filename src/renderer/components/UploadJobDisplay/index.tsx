import { Alert, Empty, Table } from "antd";
import { ColumnProps } from "antd/es/table";
import { uniq, isEmpty } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { IN_PROGRESS_STATUSES } from "../../state/constants";
import { SearchResultRow } from "../../state/metadata/types";
import { titleCase } from "../../util";
import JobOverviewDisplay from "../JobOverviewDisplay";

const styles = require('./styles.pcss');

interface UploadJobDisplayProps {
    className?: string;
    cancelUpload: () => void;
    job: UploadSummaryTableRow;
    loading: boolean;
    retryUpload: () => void;
    fileMetadataForJob?: SearchResultRow[];
    fileMetadataForJobHeader?: Array<ColumnProps<SearchResultRow>>;
    fileMetadataForJobLoading: boolean;
    onFileRowClick: (row?: SearchResultRow) => void;
}

const determineError = (error: string): string => {
    if (error.toLowerCase().includes('chmod')) {
        return `You did not have permission to read one of these files. The full error was: ${error}`;
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
    let fileMetadata;
    if (fileMetadataForJob || fileMetadataForJobLoading) {
        const fileCount = fileMetadataForJob &&
            uniq(fileMetadataForJob.map((metadata) => metadata.fileId)).length;
        const tableTitle = () => fileMetadataForJobLoading ? (
            "...Loading File Metadata"
        ) : (
            `${fileCount} ${fileCount === 1 ? 'File Was' : 'Files Were'} Part Of This Job`
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
        )
    } else if (job.serviceFields
        && job.serviceFields.files
        && !isEmpty(job.serviceFields.files)
        && job.serviceFields.files[0].file
        && job.serviceFields.files[0].file.originalPath) {
        const rows = job.serviceFields.files.map((file: { file: { originalPath: string } }) => {
            const { originalPath } = file.file;
            const filePathSections = originalPath.split('/');
            return { filename: filePathSections[filePathSections.length - 1], originalPath, key: originalPath };
        });
        fileMetadata = (
            <Table
                dataSource={rows}
                columns={["filename", "originalPath"].map((column) =>
                    ({ dataIndex: column, title: titleCase(column) })
                )}
                title={() => "Incomplete File Information Retrieved From Job"}
            />
        )
    } else {
        fileMetadata = <Empty description={"Unable to determine files for this job"} />
    }
    const error = job.serviceFields && job.serviceFields.error && (
        <Alert
            className={styles.errorAlert}
            type="error"
            message="Error"
            description={determineError(job.serviceFields.error)}
            showIcon={true}
        />
    );
    const allowCancel = IN_PROGRESS_STATUSES.includes(job.status);
    const warning = allowCancel && (
        <Alert closable={true} type="warning" message="Cancelling will make this upload unrecoverable" />
    );
    return (
        <div className={className}>
            {error}
            {warning}
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
