import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { AxiosError } from "axios";
import { ipcRenderer } from "electron";
import { debounce, uniqBy } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { OPEN_CREATE_PLATE_STANDALONE, PLATE_CREATED } from "../../../shared/constants";

import FormPage from "../../components/FormPage";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AlertType, AsyncRequest, SetAlertAction } from "../../state/feedback/types";
import { goBack, selectBarcode } from "../../state/selection/actions";
import { getSelectedBarcode } from "../../state/selection/selectors";
import { GoBackAction, SelectBarcodeAction } from "../../state/selection/types";
import { State } from "../../state/types";
import LabkeyQueryService, { Plate } from "../../util/labkey-client";

const styles = require("./style.pcss");

interface LabkeyBarcodeSelectorOption {
    barcode?: string;
    imagingSessionIds: number[];
}

interface EnterBarcodeProps {
    className?: string;
    barcode?: string;
    goBack: ActionCreator<GoBackAction>;
    saveInProgress: boolean;
    selectBarcode: ActionCreator<SelectBarcodeAction>;
    setAlert: ActionCreator<SetAlertAction>;
}

interface EnterBarcodeState {
    barcode?: string;
    imagingSessionIds: number[];
}

export const createOptionsFromGetPlatesResponse = (allPlates: Plate[]) => {
    const uniquePlateBarcodes = uniqBy(allPlates, "barcode");
    const options = uniquePlateBarcodes.map((plate: {BarCode: string}) => {
        const imagingSessionIds = allPlates
            .filter((otherPlate) => otherPlate.BarCode === plate.BarCode)
            .map((p) => p.ImagingSessionId);
        return {
            barcode: plate.BarCode,
            imagingSessionIds,
        };
    });
    return {
        options,
    };
};

const createGetBarcodesAsyncFunction = (onErr: (reason: AxiosError) => void) =>
    (input: string): Promise<{options: LabkeyBarcodeSelectorOption[]} | null> => {
    if (!input) {
        return Promise.resolve(null);
    }

    return LabkeyQueryService.Get.platesByBarcode(input)
        .then(createOptionsFromGetPlatesResponse)
        .catch((err) => {
            onErr(err);
            return err;
        });
};

class EnterBarcode extends React.Component<EnterBarcodeProps, EnterBarcodeState> {
    constructor(props: EnterBarcodeProps) {
        super(props);
        this.state = {
            barcode: props.barcode,
            imagingSessionIds: [],
        };
        this.setBarcode = this.setBarcode.bind(this);
        this.saveAndContinue = this.saveAndContinue.bind(this);
        this.setAlert = debounce(this.setAlert.bind(this), 2000);
        this.openCreatePlateModal = this.openCreatePlateModal.bind(this);

        ipcRenderer.on(PLATE_CREATED, (event: any, barcode: string) => {
            // TODO: uncomment below once redirect URL on CreatePlateStandalone includes barcode and plateId
            // this.props.selectBarcode(barcode);
        });
    }

    public render() {
        const {barcode, imagingSessionIds} = this.state;
        const {className, saveInProgress} = this.props;
        return (
            <FormPage
                className={className}
                formTitle="PLATE BARCODE"
                formPrompt="Enter a barcode associated with at least one of these files."
                saveButtonDisabled={!this.state.barcode || saveInProgress}
                onSave={this.saveAndContinue}
                saveInProgress={saveInProgress}
                onBack={this.props.goBack}
            >
                <LabKeyOptionSelector
                    required={true}
                    async={true}
                    label="Plate Barcode"
                    optionIdKey="barcode"
                    optionNameKey="barcode"
                    selected={{barcode, imagingSessionIds}}
                    onOptionSelection={this.setBarcode}
                    loadOptions={createGetBarcodesAsyncFunction(this.setAlert)}
                    placeholder="barcode"
                />
                <a href="#" className={styles.createBarcodeLink} onClick={this.openCreatePlateModal}>
                    I don't have a barcode
                </a>
            </FormPage>
        );
    }

    private setAlert(error: AxiosError): void {
        this.props.setAlert({
            message: error.message,
            statusCode: error.response ? error.response.status : undefined,
            type: AlertType.ERROR,
        });
    }

    private setBarcode(option: LabkeyBarcodeSelectorOption | null): void {
        if (option) {
            this.setState(option);
        } else {
            this.setState({
                barcode: undefined,
                imagingSessionIds: [],
            });
        }
    }

    private saveAndContinue(): void {
        if (this.state.barcode) {
            this.props.selectBarcode(this.state.barcode);
        }
    }

    private openCreatePlateModal(): void {
        ipcRenderer.send(OPEN_CREATE_PLATE_STANDALONE);
    }
}

function mapStateToProps(state: State) {
    return {
        barcode: getSelectedBarcode(state),
        saveInProgress: getRequestsInProgressContains(state, AsyncRequest.GET_PLATE),
    };
}

const dispatchToPropsMap = {
    goBack,
    selectBarcode,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(EnterBarcode);
