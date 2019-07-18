import { UploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { Collapse } from "antd";
import CollapsePanel from "antd/lib/collapse/CollapsePanel";
import { isEmpty, map } from "lodash";
import * as React from "react";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import FileMetadataDisplay from "../FileMetadataDisplay";
import JobOverviewDisplay from "../JobOverviewDisplay";

const styles = require("./styles.pcss");

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
                                        <FileMetadataDisplay
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
