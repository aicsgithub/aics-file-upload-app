import { Button, Empty, Icon } from "antd";
import * as classNames from "classnames";
import { isEmpty } from "lodash";
import * as React from "react";

import { UploadMetadata } from "../../../state/types";

const styles = require("./style.pcss");

interface WellFileAssociationsProps {
  className?: string;
  associate: () => void;
  canAssociate: boolean;
  uploads: UploadMetadata[];
  selectedFilesCount: number;
  undoAssociation: (upload: UploadMetadata) => void;
}

class FileAssociations extends React.Component<WellFileAssociationsProps, {}> {
  constructor(props: WellFileAssociationsProps) {
    super(props);
  }

  public render() {
    const {
      associate,
      canAssociate,
      className,
      selectedFilesCount,
    } = this.props;

    return (
      <div className={classNames(styles.cardContent, className)}>
        <div className={styles.files}>{this.renderFiles()}</div>
        <div className={styles.addRow}>
          <div className={styles.title}>
            Selected Files: {selectedFilesCount}
          </div>
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
    const { uploads } = this.props;
    if (isEmpty(uploads)) {
      return <Empty description="No Files" />;
    }

    return uploads.map((upload) => (
      <div className={styles.fileRow} key={upload.file}>
        <div className={styles.fileName}>
          <Icon type="file" className={styles.fileIcon} />
          {upload.file}
        </div>
        <div className={styles.deleteButton}>
          <Button
            type="danger"
            shape="circle"
            icon="delete"
            onClick={() => this.props.undoAssociation(upload)}
          />
        </div>
      </div>
    ));
  }
}

export default FileAssociations;
