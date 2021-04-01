import { Button, Modal } from "antd";
import { intersection, isEmpty, uniq, without } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { WELL_ANNOTATION_NAME } from "../../../../constants";
import { getSelectedWellIds } from "../../../../state/selection/selectors";
import { updateUpload } from "../../../../state/upload/actions";
import ImagingSessionSelector from "../../../ImagingSessionSelector";
import Plate from "../../../PlateContainer";
import DisplayCell, { CustomCell } from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

/**
 * This is used in the react-tables when a user is editing a Well annotation cell.
 * It displays the currently selected well labels and a popover with the plate UI for associating more wells.
 */
export default function WellCell(props: CustomCell) {
  const dispatch = useDispatch();
  const selectedWells = useSelector(getSelectedWellIds);
  const [isEditing, setIsEditing] = React.useState(false);
  const associatedWells = props.row.original[WELL_ANNOTATION_NAME] || [];

  // Disable association button if no wells are selected or if
  // all of the wells have already been associated with
  const isAssociatiateButtonDisabled =
    isEmpty(selectedWells) ||
    intersection(selectedWells, associatedWells).length ===
      selectedWells.length;

  // Disable remove association button if no wells are selected or if none
  // of the wells selected have been associated with the row yet
  const isRemoveButtonDisabled =
    isEmpty(selectedWells) ||
    !intersection(associatedWells, selectedWells).length;

  function onAssociate() {
    dispatch(
      updateUpload(props.row.id, {
        [WELL_ANNOTATION_NAME]: uniq([...associatedWells, ...selectedWells]),
      })
    );
  }

  function onDissociate() {
    dispatch(
      updateUpload(props.row.id, {
        [WELL_ANNOTATION_NAME]: without(associatedWells, ...selectedWells),
      })
    );
  }

  const content = (
    <div className={styles.container}>
      <div className={styles.row}>
        <ImagingSessionSelector className={styles.imagingSessionSelector} />
        <div className={styles.btns}>
          <Button
            onClick={onAssociate}
            size="small"
            type="primary"
            className={styles.associateBtn}
            disabled={isAssociatiateButtonDisabled}
          >
            Associate
          </Button>
          <Button
            onClick={onDissociate}
            disabled={isRemoveButtonDisabled}
            size="small"
          >
            Remove Association
          </Button>
        </div>
      </div>
      <div className={styles.plateContainer}>
        <Plate rowData={props.row.original} className={styles.plate} />
      </div>
    </div>
  );

  return (
    <>
      <DisplayCell
        {...props}
        onTabExit={() => setIsEditing(false)}
        onStartEditing={() => setIsEditing(true)}
      />
      <Modal
        title="Associate Wells with this row by selecting wells and clicking Associate"
        visible={isEditing}
        mask={false}
        onCancel={() => setIsEditing(false)}
        footer={null}
        width="625px"
        centered
      >
        {content}
      </Modal>
    </>
  );
}
