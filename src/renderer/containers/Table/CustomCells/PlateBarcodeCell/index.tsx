import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { getRequestsInProgress } from "../../../../state/feedback/selectors";
import { requestBarcodeSearchResults } from "../../../../state/metadata/actions";
import { getUniqueBarcodeSearchResults } from "../../../../state/metadata/selectors";
import { AsyncRequest, BarcodeSelectorOption } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { UploadTableRow } from "../../../../state/upload/types";
import LookupSearch from "../../../LookupSearch";
import DisplayCell from "../../DefaultCells/DisplayCell";
import { createEnterKeyHandler } from "../../Editors/util";

const styles = require("./styles.pcss");

/**
 * Component responsible for rendering an input for a
 * react-table instance that queries for plates by partial
 * barcode match.
 */
export default function PlateBarcodeCell(
  props: CellProps<UploadTableRow, string[]>
) {
  const dispatch = useDispatch();
  const barcodeSearchResults = useSelector(getUniqueBarcodeSearchResults);
  const requestsInProgress = useSelector(getRequestsInProgress);

  const [isEditing, setIsEditing] = React.useState(false);
  const [plateBarcode, setPlateBarcode] = React.useState<string | undefined>(
    props.value?.[0]
  );

  const isLoading = requestsInProgress.includes(
    AsyncRequest.GET_BARCODE_SEARCH_RESULTS
  );

  function onCommit() {
    setIsEditing(false);
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: plateBarcode ? [plateBarcode] : [],
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.WELL]: [],
      })
    );
  }

  // Derive state from changes outside of direct editing
  React.useEffect(() => {
    setPlateBarcode(props.value?.[0]);
  }, [props.value, setPlateBarcode]);

  if (isEditing) {
    return (
      <LookupSearch
        autoFocus
        className={styles.plateBarcodeCell}
        getDisplayFromOption={(result: BarcodeSelectorOption) => result.barcode}
        lookupAnnotationName="barcodeSearchResults"
        mode="default"
        optionsLoadingOverride={isLoading}
        optionsOverride={barcodeSearchResults}
        placeholder="Type to search"
        retrieveOptionsOverride={(i?: string) =>
          i && dispatch(requestBarcodeSearchResults(i))
        }
        onBlur={onCommit}
        onInputKeyDown={createEnterKeyHandler(onCommit)}
        selectSearchValue={(pb?: string) => setPlateBarcode(pb)}
        value={props.value?.[0]}
      />
    );
  }

  return (
    <DisplayCell
      {...props}
      onTabExit={() => setIsEditing(false)}
      onStartEditing={() => setIsEditing(true)}
    />
  );
}
