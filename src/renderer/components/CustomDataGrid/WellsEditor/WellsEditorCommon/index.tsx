import { Button } from "antd";
import * as classNames from "classnames";
import * as React from "react";

import ImagingSessionSelector from "../../../../containers/ImagingSessionSelector";
import Plate from "../../../../containers/PlateContainer";
import { MassEditRow } from "../../../../state/types";
import { UploadJobTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
  associateWithRow: Function;
  associateBtnDisabled: Function;
  removeAssociationsBtnDisabled: Function;
  rowData: UploadJobTableRow | MassEditRow;
  undoAssociation: Function;
}

class WellsEditorCommon extends React.Component<Props, {}> {
  public render() {
    const {
      className,
      associateWithRow,
      associateBtnDisabled,
      undoAssociation,
      removeAssociationsBtnDisabled,
      rowData,
    } = this.props;

    return (
      <div className={styles.container}>
        <div className={classNames(className, styles.row)}>
          <ImagingSessionSelector className={styles.imagingSessionSelector} />
          <div className={styles.btns}>
            <Button
              onClick={() => associateWithRow()}
              size="small"
              type="primary"
              className={styles.associateBtn}
              disabled={associateBtnDisabled()}
            >
              Associate
            </Button>
            <Button
              onClick={() => undoAssociation()}
              disabled={removeAssociationsBtnDisabled()}
              size="small"
            >
              Remove Association
            </Button>
          </div>
        </div>
        <div className={styles.plateContainer}>
          <Plate rowData={rowData} className={styles.plate} />
        </div>
      </div>
    );
  }
}

export default WellsEditorCommon;
