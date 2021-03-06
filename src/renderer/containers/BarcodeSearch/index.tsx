import * as React from "react";
import { connect, ConnectedProps } from "react-redux";

import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { requestBarcodeSearchResults } from "../../state/metadata/actions";
import { getUniqueBarcodeSearchResults } from "../../state/metadata/selectors";
import { AsyncRequest, BarcodeSelectorOption, State } from "../../state/types";
import LookupSearch from "../LookupSearch";

export type OnBarcodeChange = (
  imagingSessionIds: Array<number | null>,
  value?: string
) => void;

function mapStateToProps(state: State) {
  return {
    barcodeSearchResults: getUniqueBarcodeSearchResults(state),
    loading: getRequestsInProgressContains(
      state,
      AsyncRequest.GET_BARCODE_SEARCH_RESULTS
    ),
    onBarcodeInput: undefined,
  };
}

const dispatchToPropsMap = {
  getBarcodeSearchResults: requestBarcodeSearchResults,
};

const connector = connect(mapStateToProps, dispatchToPropsMap);

type BarcodeSearchProps = ConnectedProps<typeof connector> & {
  barcode?: string;
  className?: string;
  disabled?: boolean; // temporary
  error?: boolean;
  onBarcodeChange: OnBarcodeChange;
};

const handleBarcodeChange = (
  onBarcodeChangeProp: OnBarcodeChange,
  barcodeSearchResults: BarcodeSelectorOption[]
) => (value?: string) => {
  let imagingSessionIds: Array<number | null> = [];
  if (value) {
    const matchingResult = barcodeSearchResults.filter(
      (r: BarcodeSelectorOption) => r.barcode === value
    );
    imagingSessionIds =
      matchingResult.length > 0 ? matchingResult[0].imagingSessionIds : [];
  }
  onBarcodeChangeProp(imagingSessionIds, value);
};

const BarcodeSearch: React.FunctionComponent<BarcodeSearchProps> = ({
  barcode,
  barcodeSearchResults,
  className,
  disabled,
  error,
  getBarcodeSearchResults: dispatchGetBarcodeSearchResults,
  loading,
  onBarcodeChange,
}) => (
  <LookupSearch
    className={className}
    disabled={disabled}
    error={error}
    getDisplayFromOption={(result: BarcodeSelectorOption) => result.barcode}
    lookupAnnotationName="barcodeSearchResults"
    mode="default"
    optionsLoadingOverride={loading}
    optionsOverride={barcodeSearchResults}
    placeholder="Type to search"
    retrieveOptionsOverride={dispatchGetBarcodeSearchResults}
    selectSearchValue={handleBarcodeChange(
      onBarcodeChange,
      barcodeSearchResults
    )}
    value={barcode}
  />
);

export default connector(BarcodeSearch);
