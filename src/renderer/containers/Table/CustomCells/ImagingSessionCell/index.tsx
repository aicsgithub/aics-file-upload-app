import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { getPlateBarcodeToImagingSessions } from "../../../../state/selection/selectors";
import { updateUpload } from "../../../../state/upload/actions";
import { UploadTableRow } from "../../../../state/upload/types";
import DisplayCell from "../../DefaultCells/DisplayCell";
import DropdownEditor from "../../Editors/DropdownEditor";
import { ColumnValue } from "../../types";

/**
 * Component used in a react-table table to render a selection between
 * imaging sessions viable for the given plate barcode
 */
export default function ImagingSessionCell(
  props: CellProps<UploadTableRow, string[]>
) {
  const { value } = props;
  const dispatch = useDispatch();
  const plateBarcodeToImagingSessions = useSelector(
    getPlateBarcodeToImagingSessions
  );
  const [isEditing, setIsEditing] = React.useState(false);

  const plateBarcode = props.row.original[AnnotationName.PLATE_BARCODE]?.[0];
  const imagingSessions =
    plateBarcodeToImagingSessions[plateBarcode || ""] || [];
  const imagingSessionNames = Object.values(imagingSessions)
    .map((is) => is.name)
    .filter((n) => !!n) as string[];

  function commitChanges(value: ColumnValue) {
    setIsEditing(false);
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: value,
        [AnnotationName.WELL]: [],
      })
    );
  }

  if (isEditing) {
    return (
      <DropdownEditor
        initialValue={value}
        options={imagingSessionNames}
        commitChanges={commitChanges}
      />
    );
  }

  function onStartEditing() {
    if (plateBarcode && imagingSessionNames.length) {
      setIsEditing(true);
    }
  }

  return <DisplayCell {...props} onStartEditing={onStartEditing} />;
}
