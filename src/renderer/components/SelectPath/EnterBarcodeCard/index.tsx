import { Card, Icon, Select } from "antd";
import { SelectValue } from "antd/es/select";
import classNames from "classnames";
import * as React from "react";
import { BarcodeSelectorOption } from "../../../containers/SelectUploadType";

import LabeledInput from "../../LabeledInput";
import SelectedForm from "../SelectedForm";

const styles = require("./styles.pcss");

interface Props {
    barcode?: string;
    barcodeSearchResults: BarcodeSelectorOption[];
    loadingBarcodes: boolean;
    isSelected: boolean;
    onBarcodeChange: (option: SelectValue) => void;
    onBarcodeInput: (input: string) => void;
    onCancel: () => void;
}

/*
    This card is for showing and gathering relevant information for the "Enter Barcode" path to uploading.
    In this scenario a user already has a plate and can associate their files with the wells in that plate.
 */
const EnterBarcodeCard: React.FunctionComponent<Props> = ({
                                                              barcode,
                                                              barcodeSearchResults,
                                                              loadingBarcodes,
                                                              isSelected,
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
                The barcode you enter below will be used to associate your files with the wells in the
                matching plate.
            </p>
            {isSelected ? (
                <>
                    <p>Plate Barcode: {barcode}</p>
                    <SelectedForm onCancel={onCancel} />
                </>
            ) : (
                <LabeledInput label="Plate Barcode">
                    <Select
                        suffixIcon={<Icon type="search"/>}
                        allowClear={true}
                        className={styles.selector}
                        showSearch={true}
                        showArrow={false}
                        notFoundContent={<div>Start typing to search</div>}
                        value={barcode}
                        placeholder="Type to search"
                        autoClearSearchValue={true}
                        onChange={onBarcodeChange}
                        onSearch={onBarcodeInput}
                        loading={loadingBarcodes}
                        defaultActiveFirstOption={false}
                    >
                        {barcodeSearchResults.map((option) => (
                            <Select.Option key={option.barcode}>{option.barcode}</Select.Option>
                        ))}
                    </Select>
                </LabeledInput>
            )}
        </Card>
    );
};

export default EnterBarcodeCard;
