import { Button, Empty, Icon } from "antd";
import * as classNames from "classnames";
import { isEmpty } from "lodash";
import * as React from "react";

const styles = require("./style.pcss");

interface WellFileAssociationsProps {
    className?: string;
    associate: () => void;
    canAssociate: boolean;
    files: string[];
    selectedFilesCount: number;
    undoAssociation: (file: string) => void;
}

class WellFileAssociations extends React.Component<WellFileAssociationsProps, {}> {
    constructor(props: WellFileAssociationsProps) {
        super(props);
        this.undoAssociation = this.undoAssociation.bind(this);
    }

    public render() {
        const { associate, canAssociate, className, selectedFilesCount } = this.props;

        return (
            <div className={classNames(styles.cardContent, className)}>
                <div className={styles.files}>
                    {this.renderFiles()}
                </div>
                <div className={styles.addRow}>
                    <div className={styles.title}>Selected File(s): {selectedFilesCount}</div>
                    <Button
                        type="primary"
                        disabled={!canAssociate}
                        onClick={associate}
                        className={styles.associateButton}
                    >
                        Associate
                    </Button>
                </div>
            </div>
        );
    }

    private renderFiles() {
        const { files } = this.props;
        if (isEmpty(files)) {
            return <Empty description="No Files"/>;
        }

        return files.map(this.renderFileRow, this);
    }

    private renderFileRow(file: string) {
        return (
            <div className={styles.fileRow} key={file}>
                <div className={styles.fileName}>
                    <Icon type="file" className={styles.fileIcon} />{file}
                </div>
                <div className={styles.deleteButton}>
                    <Button type="danger" shape="circle" icon="delete" onClick={this.undoAssociation(file)} />
                </div>
            </div>
        );
    }

    private undoAssociation(file: string) {
        return () => this.props.undoAssociation(file);
    }
}

export default WellFileAssociations;
