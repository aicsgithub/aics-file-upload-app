import { Alert, Button, Divider, List, Modal, Row } from "antd";
import { shell } from "electron";
import { forOwn, isNil } from "lodash";
import os from "os";
import * as React from "react";

import { setAlert } from "../../state/feedback/actions";
import { AlertType } from "../../state/feedback/types";
import { MAIN_FILE_COLUMNS, UNIMPORTANT_COLUMNS } from "../../state/metadata/constants";
import { SearchResultRow } from "../../state/metadata/types";
import { titleCase } from "../../util";

const styles = require("./styles.pcss");

interface FileMetadataProps {
    closeFileDetailModal: () => void;
    fileMetadata?: SearchResultRow;
}

interface ListItem {
    key: string;
    value: string | number;
}

const MAC = "Darwin";
const WINDOWS = "Windows_NT";

const listItemRenderer = (({ key, value }: ListItem): JSX.Element => (
    // Had to use inline style to override List.Item's border rules
    <List.Item style={{ border: "1px solid #e8e8e8" }}>
        <h4 className={styles.key}>{titleCase(key)}</h4>
        <span className={styles.value}>{value}</span>
    </List.Item>
));

const FileMetadataModal: React.FunctionComponent<FileMetadataProps> = ({   closeFileDetailModal,
                                                                           fileMetadata,
                                                                        }) => {
    if (!fileMetadata) {
        return null;
    }
    const fileMetadataCategories: { [key: string]: ListItem[] } = { annotations: [], extra: [], info: [] };
    forOwn(fileMetadata, (value, key) => {
        // Exclude Filename since it is already shown in title & key since its just for programmatic use
        if (!isNil(value) && key !== "filename" && key !== "key") {
            if (MAIN_FILE_COLUMNS.includes(key)) {
                fileMetadataCategories.info.push({ key, value });
            } else if (UNIMPORTANT_COLUMNS.includes(key)) {
                fileMetadataCategories.extra.push({ key, value });
            } else {
                fileMetadataCategories.annotations.push({ key, value });
            }
        }
    });
    const isLocal = !!fileMetadata.localFilePath;
    const isPublic = !!fileMetadata.publicFilePath;
    const isArchive = !!fileMetadata.archiveFilePath;
    const onBrowseToFile = () => {
        const filePath = fileMetadata.localFilePath as string;
        let downloadPath;
        const userOS = os.type();
        if (userOS === WINDOWS) {
            downloadPath = filePath.replace(/\//g, "\\");
        } else if (userOS === MAC) {
            downloadPath = filePath;
        } else { // Linux
            downloadPath = filePath;
        }
        if (!shell.showItemInFolder(downloadPath)) {
            setAlert({
                message: "Failed to browse to file, contact software or browse to file path " +
                    "using local files path shown in metadata",
                type: AlertType.ERROR,
            });
        }
    };
    return (
        <Modal
            footer={null}
            visible={true}
            closable={true}
            width="90%"
            onCancel={closeFileDetailModal}
            title={<h3>File Details For <strong>{fileMetadata.filename}</strong></h3>}
        >
            <List
                grid={{ gutter: 4, xs: 3 }}
                dataSource={fileMetadataCategories.info}
                renderItem={listItemRenderer}
            />
            <Divider>Annotations</Divider>
            <List
                grid={{ gutter: 4, xs: 3 }}
                dataSource={fileMetadataCategories.annotations}
                renderItem={listItemRenderer}
            />
            <Divider>Extra File Metadata</Divider>
            <List
                grid={{ gutter: 4, xs: 3 }}
                dataSource={fileMetadataCategories.extra}
                renderItem={listItemRenderer}
            />
            {(isArchive && !isPublic && !isLocal) && (
                <Alert type="warning" message="File is only available for download from the archive" />
            )}
            {(!isArchive && !isPublic && !isLocal) && (
                <Alert type="error" message="File doesn't appear to be available for download from anywhere" />
            )}
            {isPublic && (
                <Alert type="error" message="Currently not supporting public files" />
            )}
            {isLocal && (
                <Row>
                    <Button
                        type="primary"
                        className={styles.browseButton}
                        onClick={onBrowseToFile}
                    >Browse To Local File
                    </Button>
                </Row>
            )}
        </Modal>
    );
};

export default FileMetadataModal;
