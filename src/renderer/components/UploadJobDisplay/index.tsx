import { Alert, Empty, Table } from "antd";
import { ColumnProps } from "antd/es/table";
import { uniq } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { IN_PROGRESS_STATUSES } from "../../state/constants";
import { SearchResultRow } from "../../state/metadata/types";
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
    openFileDetailModal: (e?: any, row?: SearchResultRow) => void;
}

const UploadJobDisplay: React.FunctionComponent<UploadJobDisplayProps> = ({
                                                                              cancelUpload,
                                                                              className,
                                                                              job,
                                                                              loading,
                                                                              retryUpload,
                                                                              fileMetadataForJob,
                                                                              fileMetadataForJobHeader,
                                                                              fileMetadataForJobLoading,
                                                                              openFileDetailModal,
                                                                          }: UploadJobDisplayProps) => {
    let fileMetadataTable;
    if (fileMetadataForJob || fileMetadataForJobLoading) {
        const fileCount = fileMetadataForJob &&
            uniq(fileMetadataForJob.map((metadata) => metadata.fileId)).length;
        const tableTitle = () => fileMetadataForJobLoading ? (
            "...Loading File Metadata"
        ) : (
            `${fileCount} ${fileCount === 1 ? 'File Was' : 'Files Were'} Part Of This Job`
        );
        const onRow = (record: SearchResultRow) => ({ onClick: () => openFileDetailModal(undefined, record) });
        fileMetadataTable = (
            <Table
                dataSource={fileMetadataForJob}
                columns={fileMetadataForJobHeader}
                loading={fileMetadataForJobLoading}
                title={tableTitle}
                onRow={onRow}
            />
        )
    }
    const error = job.serviceFields && job.serviceFields.error && (
        <Alert
            className={styles.errorAlert}
            type="error"
            message="Error"
            description={job.serviceFields.error}
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
            {fileMetadataTable || <Empty description={"Unable to determine files for this job"} />}
        </div>
    );
};

export default UploadJobDisplay;
