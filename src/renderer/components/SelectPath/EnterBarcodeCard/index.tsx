import { Card, Icon, Radio, Select } from "antd";
import { RadioChangeEvent } from "antd/es/radio";
import { SelectValue } from "antd/es/select";
import { get } from "lodash";
import * as React from "react";
import { BarcodeSelectorOption } from "../../../containers/SelectUploadType";

import { ImagingSession } from "../../../state/metadata/types";

import LabeledInput from "../../LabeledInput";
import SelectedForm from "../SelectedForm";

const styles = require("./styles.pcss");

interface Props {
    barcode?: string;
    barcodeSearchResults: BarcodeSelectorOption[];
    loadingBarcodes: boolean;
    imagingSessionId?: number | null;
    imagingSessionIds: Array<number | null>;
    imagingSessions: ImagingSession[];
    isSelected: boolean;
    onBarcodeChange: (option: SelectValue) => void;
    onBarcodeInput: (input: string) => void;
    onCancel: () => void;
    onImagingSessionChanged: (event: RadioChangeEvent) => void;
}

/*
    This card is for showing and gathering relevant information for the "Enter Barcode" path to uploading.
    In this scenario a user already has a plate and can associate their files with the wells in that plate.
 */
const EnterBarcodeCard: React.FunctionComponent<Props> = ({
                                                              barcode,
                                                              barcodeSearchResults,
                                                              loadingBarcodes,
                                                              imagingSessionId,
                                                              imagingSessionIds,
                                                              imagingSessions,
                                                              isSelected,
                                                              onBarcodeChange,
                                                              onBarcodeInput,
                                                              onCancel,
                                                              onImagingSessionChanged,
                                                           }: Props) => {
    const getImagingSessionName = (id?: number | null) => {
        if (id == null) {
            return "None";
        }

        const matchingImagingSession = imagingSessions.find((i) => i.imagingSessionId === id);
        return get(matchingImagingSession, ["name"], `Imaging Session Id: ${id}`);
    };

    const renderImagingSessionInput = (): JSX.Element | null => {
        if (imagingSessionIds.length < 2) {
            return null;
        }
        if (isSelected) {
            return <p>Imaging Session: {getImagingSessionName(imagingSessionId)}</p>;
        }

        return (
            <LabeledInput label="Which Imaging Session?" className={styles.imagingSessions}>
                <Radio.Group buttonStyle="solid" value={imagingSessionId} onChange={onImagingSessionChanged}>
                    {imagingSessionIds.map((id) => (
                        <Radio.Button className={styles.imagingSessionOption} value={id || "None"} key={id || "None"}>
                            {getImagingSessionName(id)}
                        </Radio.Button>
                    ))}
                </Radio.Group>
            </LabeledInput>
        );
    };

    return (
        <Card title="Enter Barcode" className={styles.card}>
            <p>
                The barcode you enter below will be used to associate your files with the wells in the
                matching plate.
            </p>
            {isSelected ? (
                <>
                    <p>Plate Barcode: {barcode}</p>
                    {renderImagingSessionInput()}
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
                    {renderImagingSessionInput()}
                </LabeledInput>
            )}
        </Card>
    );
};

export default EnterBarcodeCard;
