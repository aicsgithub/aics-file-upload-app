import { Card, Select } from "antd";
import classNames from "classnames";
import * as React from "react";

import { BarcodePrefix } from "../../../services/labkey-client/types";
import LabeledInput from "../../LabeledInput";
import SelectedForm from "../SelectedForm";

const styles = require("./styles.pcss");

interface Props {
  barcodePrefixId?: number;
  barcodePrefixes: BarcodePrefix[];
  isSelected: boolean;
  onCancel: () => void;
  onBarcodePrefixChanged: (prefix: number | null) => void;
}

/*
    This card is for showing and gathering relevant information for the "Create Barcode" path to uploading.
    In this scenario a user does not yet have a plate, but can create one. After creating one using the Plate UI
    the user will then merge into the "Enter Barcode" path.
 */
const CreateBarcodeCard: React.FunctionComponent<Props> = ({
  barcodePrefixId,
  barcodePrefixes,
  isSelected,
  onCancel,
  onBarcodePrefixChanged,
}: Props) => {
  const prefix =
    isSelected &&
    barcodePrefixes.find(({ prefixId }) => prefixId === barcodePrefixId);
  return (
    <Card
      hoverable={true}
      title="Create Barcode & Plate"
      className={classNames(styles.card, isSelected && styles.selectedCard)}
    >
      <p>
        Using the barcode prefix you select below we will prompt you to create a
        LabKey plate on the next page. After which this process will be the same
        as the Enter Barcode process.
      </p>
      {isSelected ? (
        <>
          <p>Barcode Prefix: {prefix && prefix.prefix}</p>
          <SelectedForm onCancel={onCancel} />
        </>
      ) : (
        <LabeledInput label="Barcode Prefix">
          <Select
            className={styles.selector}
            value={barcodePrefixId}
            onSelect={onBarcodePrefixChanged}
            placeholder="Select Barcode Prefix"
          >
            {barcodePrefixes.map(({ prefixId, description }) => (
              <Select.Option value={prefixId} key={prefixId}>
                {description}
              </Select.Option>
            ))}
          </Select>
        </LabeledInput>
      )}
    </Card>
  );
};

export default CreateBarcodeCard;
