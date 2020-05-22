import { Card } from "antd";
import classNames from "classnames";
import * as React from "react";

import BarcodeSearch from "../../../containers/BarcodeSearch";
import LabeledInput from "../../LabeledInput";
import SelectedForm from "../SelectedForm";

const styles = require("./styles.pcss");

interface Props {
  barcode?: string;
  isSelected: boolean;
  onBarcodeChange: (
    imagingSessionIds: Array<number | null>,
    option?: string
  ) => void;
  onCancel: () => void;
}

/*
    This card is for showing and gathering relevant information for the "Enter Barcode" path to uploading.
    In this scenario a user already has a plate and can associate their files with the wells in that plate.
 */
const EnterBarcodeCard: React.FunctionComponent<Props> = ({
  barcode,
  isSelected,
  onBarcodeChange,
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
          <BarcodeSearch onBarcodeChange={onBarcodeChange} barcode={barcode} />
        </LabeledInput>
      )}
    </Card>
  );
};

export default EnterBarcodeCard;
