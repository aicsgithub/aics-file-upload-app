import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { Radio } from "antd";
import { RadioChangeEvent } from "antd/lib/radio";
import { AxiosError } from "axios";
import { ipcRenderer } from "electron";
import { debounce, get, uniqBy } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { OPEN_CREATE_PLATE_STANDALONE, PLATE_CREATED } from "../../../shared/constants";

import FormPage from "../../components/FormPage";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AlertType, AsyncRequest, SetAlertAction } from "../../state/feedback/types";
import { requestImagingSessions } from "../../state/metadata/actions";
import { getImagingSessions } from "../../state/metadata/selectors";
import { GetImagingSessionsAction, ImagingSession } from "../../state/metadata/types";
import { goBack, selectBarcode } from "../../state/selection/actions";
import {
    getSelectedBarcode,
    getSelectedImagingSessionId,
    getSelectedImagingSessionIds
} from "../../state/selection/selectors";
import { GoBackAction, SelectBarcodeAction } from "../../state/selection/types";
import { State } from "../../state/types";
import LabkeyQueryService from "../../util/labkey-client";

const styles = require("./style.pcss");

interface LabkeyBarcodeSelectorOption {
    barcode?: string;
    imagingSessionIds: number[];
}

interface EnterBarcodeProps {
    className?: string;
    // get the most recent list of all imaging sessions in the db
    getImagingSessions: ActionCreator<GetImagingSessionsAction>;
    goBack: ActionCreator<GoBackAction>;
    imagingSessions: ImagingSession[];
    saveInProgress: boolean;
    selectBarcode: ActionCreator<SelectBarcodeAction>;
    selectedBarcode?: string;
    selectedImagingSessionId?: number;
    // all imaging session ids that are associated with the selectedBarcode
    selectedImagingSessionIds: number[];
    setAlert: ActionCreator<SetAlertAction>;
}

interface EnterBarcodeState {
    barcode?: string;
    imagingSessionId?: number;
    imagingSessionIds: number[];
}

export const createOptionsFromGetPlatesResponse = (allPlates: Array<{barcode: string, imagingSessionId: number}>) => {
    const uniquePlateBarcodes = uniqBy(allPlates, "barcode");
    const options = uniquePlateBarcodes.map((plate) => {
        const imagingSessionIds = allPlates
            .filter((otherPlate) => otherPlate.barcode === plate.barcode)
            .map((p) => p.imagingSessionId);
        return {
            barcode: plate.barcode,
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
            barcode: props.selectedBarcode,
            imagingSessionId: props.selectedImagingSessionId,
            imagingSessionIds: props.selectedImagingSessionIds,
        };
        this.setBarcode = this.setBarcode.bind(this);
        this.saveAndContinue = this.saveAndContinue.bind(this);
        this.setAlert = debounce(this.setAlert.bind(this), 2000);
        this.openCreatePlateModal = this.openCreatePlateModal.bind(this);

        ipcRenderer.on(PLATE_CREATED, (event: any, barcode: string) => {
            // TODO: uncomment below once redirect URL on CreatePlateStandalone includes barcode and imagingSessionId
            // this.props.selectBarcode(barcode);
        });
    }

    public componentDidMount() {
        this.props.getImagingSessions();
    }

    public render() {
        const {barcode, imagingSessionIds} = this.state;
        const {className, saveInProgress} = this.props;
        return (
            <FormPage
                className={className}
                formTitle="PLATE BARCODE"
                formPrompt="Enter a barcode associated with at least one of these files."
                saveButtonDisabled={this.saveButtonDisabled()}
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
                {this.renderPlateOptions()}
            </FormPage>
        );
    }

    private renderPlateOptions = (): JSX.Element | null => {
        const { imagingSessionIds, imagingSessionId } = this.state;

        if (imagingSessionIds.length < 2) {
            return null;
        }

        return (
            <div className={styles.imagingSessions}>
                <div>Which Imaging Session? <span className={styles.asterisk}>*</span></div>
                <Radio.Group buttonStyle="solid" value={imagingSessionId} onChange={this.onImagingSessionChanged}>
                    {imagingSessionIds.map((id) => {
                        const option = this.getImagingSessionName(id);
                        return (
                            <Radio.Button value={id} key={option}>
                                {option}
                            </Radio.Button>
                        );
                    })}
                </Radio.Group>
            </div>
        );
    }

    private onImagingSessionChanged = (event: RadioChangeEvent) => {
        const imagingSessionId = event.target.value;
        this.setState({imagingSessionId});
    }

    private getImagingSessionName = (id: number) => {
        const { imagingSessions } = this.props;
        const matchingImagingSession = imagingSessions.find((i) => i.imagingSessionId === id);
        return get(matchingImagingSession, ["name"], `Imaging Session Id: ${id}`);
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
            const { imagingSessions } = this.props;
            const { imagingSessionIds } = option;
            const imagingSessionIdsWithInfo = imagingSessionIds.filter((i) => !!imagingSessions[i]);
            const haveImagingSessionInfo = imagingSessionIdsWithInfo.length === imagingSessionIds.length;

            if (!haveImagingSessionInfo) {
                this.props.getImagingSessions();
            }
        } else {
            this.setState({
                barcode: undefined,
                imagingSessionIds: [],
            });
        }
    }

    private saveAndContinue(): void {
        const { barcode, imagingSessionId, imagingSessionIds} = this.state;
        if (barcode) {
            this.props.selectBarcode(barcode, imagingSessionIds, imagingSessionId);
        }
    }

    private saveButtonDisabled = (): boolean => {
        const {saveInProgress} = this.props;
        const {barcode, imagingSessionId, imagingSessionIds} = this.state;
        const multipleOptions = imagingSessionIds.length > 1;
        const plateSelected = multipleOptions ? barcode && imagingSessionId : barcode;
        return !plateSelected || saveInProgress;
    }

    private openCreatePlateModal(): void {
        ipcRenderer.send(OPEN_CREATE_PLATE_STANDALONE);
    }
}

function mapStateToProps(state: State) {
    return {
        imagingSessions: getImagingSessions(state),
        saveInProgress: getRequestsInProgressContains(state, AsyncRequest.GET_PLATE),
        selectedBarcode: getSelectedBarcode(state),
        selectedImagingSessionId: getSelectedImagingSessionId(state),
        selectedImagingSessionIds: getSelectedImagingSessionIds(state),
    };
}

const dispatchToPropsMap = {
    getImagingSessions: requestImagingSessions,
    goBack,
    selectBarcode,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(EnterBarcode);
