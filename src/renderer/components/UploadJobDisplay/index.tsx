import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Alert, Table } from "antd";
import { ColumnProps } from "antd/es/table";
import { get, isEmpty } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { IN_PROGRESS_STATUSES } from "../../state/constants";
import { SearchResultRow } from "../../state/metadata/types";
import JobOverviewDisplay from "../JobOverviewDisplay";

interface UploadJobDisplayProps {
    className?: string;
    cancelUpload: () => void;
    job: UploadSummaryTableRow;
    loading: boolean;
    retryUpload: () => void;
    fileMetadataForJob?: SearchResultRow[];
    fileMetadataForJobHeader?: Array<ColumnProps<SearchResultRow>>;
    openFileDetailModal: (e?: any, row?: SearchResultRow) => void;
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
                                                                              fileMetadataForJob,
                                                                              fileMetadataForJobHeader,
                                                                              openFileDetailModal,
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
    const tableTitle = () => `${files.length} In This Job`;
    const onRow = (record: SearchResultRow) => ({ onClick: () => openFileDetailModal(undefined, record) });
    return (
        <div className={className}>
            {error}
            {allowCancel && (
                <Alert closable={true} type="warning" message="Cancelling will make this upload unrecoverable" />
            )}
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
                    <Table
                        dataSource={fileMetadataForJob}
                        columns={fileMetadataForJobHeader}
                        title={tableTitle}
                        onRow={onRow}
                    />
                </>
            )}
        </div>
    );
};

export default UploadJobDisplay;
