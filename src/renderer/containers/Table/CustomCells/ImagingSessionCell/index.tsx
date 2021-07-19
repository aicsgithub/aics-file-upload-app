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
 * TODO
 */
export default function ImagingSessionCell(
  props: CellProps<UploadTableRow, ColumnValue>
) {
  const { value } = props;
  const dispatch = useDispatch();
  const plateBarcodeToImagingSessions = useSelector(
    getPlateBarcodeToImagingSessions
  );
  const [isEditing, setIsEditing] = React.useState(false);

  const plateBarcode = props.row.original[AnnotationName.PLATE_BARCODE]?.[0];
  const imagingSessions = plateBarcode
    ? plateBarcodeToImagingSessions[plateBarcode]
    : undefined;

  function commitChanges(value: ColumnValue) {
    setIsEditing(false);
    dispatch(updateUpload(props.row.id, { [props.column.id]: value }));
  }

  // TODO: Show disabled if no plate barcode selected
  // TODO: Show loading if imaging sessions is undefined

  if (isEditing) {
    return (
      <DropdownEditor
        initialValue={value as string[]}
        options={imagingSessions || []}
        commitChanges={commitChanges}
      />
    );
  }

  return <DisplayCell {...props} onStartEditing={() => setIsEditing(true)} />;
}
