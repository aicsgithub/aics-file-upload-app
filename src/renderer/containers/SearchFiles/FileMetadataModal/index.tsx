import { Descriptions, Modal } from "antd";
import { startCase, forOwn } from "lodash";
import * as React from "react";

import { MAIN_FILE_COLUMNS, UNIMPORTANT_COLUMNS } from "../../../state/metadata/constants";
import { SearchResultRow } from "../../../state/metadata/types";

const styles = require("./styles.pcss");

interface FileMetadataProps {
    fileMetadata?: SearchResultRow;
    toggleFileDetailModal: () => void;
}

const FileMetadataModal: React.FunctionComponent<FileMetadataProps> = ({ fileMetadata, toggleFileDetailModal }) => {
    if (!fileMetadata) {
        return null;
    }
    const fileMetadataCategories: { [key: string]: JSX.Element[] } = { annotations: [], extra: [], info: [] };
    forOwn(fileMetadata, (value, key) => {
        // Exclude Filename since it is already shown in title
        if (key !== 'filename') {
            const description = (
                <Descriptions.Item label={startCase(key)} key={key}>
                    {value || 'None'}
                </Descriptions.Item>
            );
            if (MAIN_FILE_COLUMNS.includes(key)) {
                fileMetadataCategories.info.push(description);
            } else if (UNIMPORTANT_COLUMNS.includes(key)) {
                fileMetadataCategories.extra.push(description);
            } else {
                fileMetadataCategories.annotations.push(description);
            }
        }
    });
    return (
        <Modal
            footer={null}
            visible={true}
            closable={true}
            width="90%"
            onCancel={toggleFileDetailModal}
            title={`File Details for ${fileMetadata.filename}`}
        >
            <Descriptions bordered title="Info">
                {fileMetadataCategories.info}
            </Descriptions>
            <Descriptions bordered className={styles.description} title="Annotations">
                {fileMetadataCategories.annotations}
            </Descriptions>
            <Descriptions bordered className={styles.description} title="Extra File Metadata">
                {fileMetadataCategories.extra}
            </Descriptions>
        </Modal>
    );
}

export default FileMetadataModal;
