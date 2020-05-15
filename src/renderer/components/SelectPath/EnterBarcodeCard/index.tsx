import { Card } from "antd";
import classNames from "classnames";
import * as React from "react";
import LookupSearch from "../../../containers/LookupSearch";
import { BarcodeSelectorOption } from "../../../containers/SelectUploadType";

import LabeledInput from "../../LabeledInput";
import SelectedForm from "../SelectedForm";

const styles = require("./styles.pcss");

interface Props {
  barcode?: string;
  barcodeSearchResults: BarcodeSelectorOption[];
  isSelected: boolean;
  loadingBarcodes: boolean;
  onBarcodeChange: (option?: string) => void;
  onBarcodeInput: (input?: string) => void;
  onCancel: () => void;
}

const getDisplayFromPlateResult = (result: BarcodeSelectorOption) =>
  result.barcode;

/*
    This card is for showing and gathering relevant information for the "Enter Barcode" path to uploading.
    In this scenario a user already has a plate and can associate their files with the wells in that plate.
 */
const EnterBarcodeCard: React.FunctionComponent<Props> = ({
  barcode,
  barcodeSearchResults,
  isSelected,
  loadingBarcodes,
  onBarcodeChange,
  onBarcodeInput,
  onCancel,
}: Props) => {
  return (
    <Card
      hoverable={true}
      title="Enter Barcode"
      className={classNames(styles.card, isSelected && styles.selectedCard)}
    >
      <p>
        The barcode you enter below will be used to associate your files with
        the wells in the matching plate.
      </p>
      {isSelected ? (
        <>
          <p>Plate Barcode: {barcode}</p>
          <SelectedForm onCancel={onCancel} />
        </>
      ) : (
        <LabeledInput label="Plate Barcode">
          <LookupSearch
            className={styles.selector}
            getDisplayFromOption={getDisplayFromPlateResult}
            lookupAnnotationName={"barcodeSearchResults"}
            mode="default"
            optionsLoadingOverride={loadingBarcodes}
            optionsOverride={barcodeSearchResults}
            placeholder="Type to search"
            retrieveOptionsOverride={onBarcodeInput}
            selectSearchValue={onBarcodeChange}
            value={barcode}
          />
        </LabeledInput>
      )}
    </Card>
  );
};

export default EnterBarcodeCard;
