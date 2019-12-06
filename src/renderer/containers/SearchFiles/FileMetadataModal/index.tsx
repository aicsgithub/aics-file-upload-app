import { Alert, Button, Divider, List, Modal, Row } from "antd";
import { shell } from "electron";
import { startCase, forOwn, isNil } from "lodash";
import os from 'os';
import * as React from "react";

import { MAIN_FILE_COLUMNS, UNIMPORTANT_COLUMNS } from "../../../state/metadata/constants";
import { SearchResultRow } from "../../../state/metadata/types";

const styles = require("./styles.pcss");

interface FileMetadataProps {
    fileMetadata?: SearchResultRow;
    toggleFileDetailModal: () => void;
}

interface ListItem {
    key: string;
    value?: any;
}

const MAC = 'Darwin';
const WINDOWS = 'Windows_NT';

const FileMetadataModal: React.FunctionComponent<FileMetadataProps> = ({ fileMetadata, toggleFileDetailModal }) => {
    if (!fileMetadata) {
        return null;
    }
    const fileMetadataCategories: { [key: string]: ListItem[] } = { annotations: [], extra: [], info: [] };
    forOwn(fileMetadata, (value, key) => {
        // Exclude Filename since it is already shown in title
        if (!isNil(value) && key !== 'filename' && key !== 'key') {
            if (MAIN_FILE_COLUMNS.includes(key)) {
                fileMetadataCategories.info.push({ key, value });
            } else if (UNIMPORTANT_COLUMNS.includes(key)) {
                fileMetadataCategories.extra.push({ key, value });
            } else {
                fileMetadataCategories.annotations.push({ key, value });
            }
        }
    });
    const listItemRenderer = (({ key, value }: ListItem): JSX.Element => (
        <List.Item style={{ border: '1px solid #e8e8e8' }}>
            <h4 className={styles.key}>{startCase(key)}</h4>
            <span className={styles.value}>{value || 'None'}</span>
        </List.Item>
    ));
    const userOS = os.type();
    const isLocal = !!fileMetadata.localFilePath;
    const isPublic = !!fileMetadata.publicFilePath;
    const isArchive = !!fileMetadata.archiveFilePath;
    const download = (filePath: string | number): void => {
        const path = filePath as string;
        let downloadPath;
        if (userOS === WINDOWS) {
            downloadPath = path.replace(/\//g, '\\');
        } else if (userOS === MAC) {
            downloadPath = path;
        } else { // Linux
            downloadPath = path;
        }
        const success = shell.showItemInFolder(downloadPath); // TODO: Test on different OS
        if (!success) {
            // set error!
            console.log('error!');
        }
    };
    return (
        <Modal
            footer={null}
            visible={true}
            closable={true}
            width="90%"
            onCancel={toggleFileDetailModal}
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
            <Row>
                {isPublic && (
                    <Button
                        type="primary"
                        className={styles.downloadButton}
                        onClick={() => download(fileMetadata.publicFilePath)}
                    >Browse To Public File
                    </Button>
                )}
                {isLocal && (
                    <Button
                        type="primary"
                        className={styles.downloadButton}
                        onClick={() => download(fileMetadata.localFilePath)}
                    >Browse To Local File
                    </Button>
                )}
            </Row>
        </Modal>
    );
}

export default FileMetadataModal;
