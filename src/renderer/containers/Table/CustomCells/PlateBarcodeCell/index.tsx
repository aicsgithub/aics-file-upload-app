import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { getRequestsInProgress } from "../../../../state/feedback/selectors";
import { requestBarcodeSearchResults } from "../../../../state/metadata/actions";
import { getUniqueBarcodeSearchResults } from "../../../../state/metadata/selectors";
import { AsyncRequest, BarcodeSelectorOption } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { UploadTableRow } from "../../../../state/upload/types";
import LookupSearch from "../../../LookupSearch";
import DisplayCell from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

/**
 * TODO
 */
export default function PlateBarcodeCell(
  props: CellProps<UploadTableRow, string>
) {
  const dispatch = useDispatch();
  const barcodeSearchResults = useSelector(getUniqueBarcodeSearchResults);
  const requestsInProgress = useSelector(getRequestsInProgress);

  const [isEditing, setIsEditing] = React.useState(false);

  const isLoading = requestsInProgress.includes(
    AsyncRequest.GET_BARCODE_SEARCH_RESULTS
  );

  function onSelectBarcode(barcode?: string) {
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: barcode ? [barcode] : undefined,
      })
    );
  }

  if (isEditing) {
    return (
      <LookupSearch
        getDisplayFromOption={(result: BarcodeSelectorOption) => result.barcode}
        lookupAnnotationName="barcodeSearchResults"
        mode="default"
        optionsLoadingOverride={isLoading}
        optionsOverride={barcodeSearchResults}
        placeholder="Type to search"
        retrieveOptionsOverride={(i?: string) =>
          i && dispatch(requestBarcodeSearchResults(i))
        }
        selectSearchValue={onSelectBarcode}
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
