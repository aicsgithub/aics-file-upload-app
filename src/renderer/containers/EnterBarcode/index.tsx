import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { Button, Col, Radio, Row } from "antd";
import { RadioChangeEvent } from "antd/lib/radio";
import { AxiosError } from "axios";
import { ipcRenderer } from "electron";
import { debounce, get, uniqBy } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { PLATE_CREATED } from "../../../shared/constants";

import FormPage from "../../components/FormPage";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AlertType, AsyncRequest, SetAlertAction } from "../../state/feedback/types";
import {
    createBarcode,
    requestBarcodePrefixes,
    requestImagingSessions
} from "../../state/metadata/actions";
import { getBarcodePrefixes, getImagingSessions } from "../../state/metadata/selectors";
import {
    BarcodePrefix,
    CreateBarcodeAction,
    GetBarcodePrefixesAction,
    GetImagingSessionsAction,
    ImagingSession
} from "../../state/metadata/types";
import { goBack, selectBarcode } from "../../state/selection/actions";
import {
    getSelectedBarcode,
    getSelectedBarcodePrefix,
    getSelectedImagingSession,
    getSelectedImagingSessionId,
    getSelectedImagingSessionIds
} from "../../state/selection/selectors";
import { GoBackAction, SelectBarcodeAction } from "../../state/selection/types";
import { State } from "../../state/types";
import LabkeyQueryService from "../../util/labkey-client";

const styles = require("./style.pcss");

interface LabkeyBarcodeSelectorOption {
    barcode?: string;
    imagingSessionIds: Array<number | null>;
}

interface LabkeyPlateResponse {
    barcode: string;
    imagingSessionId: number | null;
}

interface EnterBarcodeProps {
    barcodePrefixes: BarcodePrefix[];
    className?: string;
    createBarcode: ActionCreator<CreateBarcodeAction>;
    // get the most recent list of all imaging sessions in the db
    getImagingSessions: ActionCreator<GetImagingSessionsAction>;
    getBarcodePrefixes: ActionCreator<GetBarcodePrefixesAction>;
    goBack: ActionCreator<GoBackAction>;
    imagingSessions: ImagingSession[];
    saveInProgress: boolean;
    selectBarcode: ActionCreator<SelectBarcodeAction>;
    selectedBarcode?: string;
    selectedBarcodePrefix?: BarcodePrefix | null;
    selectedImagingSession?: ImagingSession | null;
    // undefined means that the user did not select an imaging session id. null means that the user chose
    // a plate without an imaging session id (when other imaging sessions were available)
    selectedImagingSessionId?: number | null;
    // all imaging session ids that are associated with the selectedBarcode
    selectedImagingSessionIds: Array<number | null>;
    setAlert: ActionCreator<SetAlertAction>;
}

interface EnterBarcodeState {
    barcode?: string;
    barcodePrefix?: BarcodePrefix;
    imagingSession?: ImagingSession;
    imagingSessionId?: number | null;
    imagingSessionIds: Array<number | null>;
    showCreateBarcodeForm: boolean;
    barcodes?: string[];
}

export const createOptionsFromGetPlatesResponse = (allPlates: LabkeyPlateResponse[]) => {
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
        .catch((err: any) => {
            onErr(err);
            return err;
        });
};

class EnterBarcode extends React.Component<EnterBarcodeProps, EnterBarcodeState> {
    constructor(props: EnterBarcodeProps) {
        super(props);
        this.state = {
            barcode: props.selectedBarcode,
            barcodePrefix: props.selectedBarcodePrefix || undefined,
            imagingSession: props.selectedImagingSession || undefined,
            imagingSessionId: props.selectedImagingSessionId,
            imagingSessionIds: props.selectedImagingSessionIds,
            showCreateBarcodeForm: false,
        };
        this.createBarcode = this.createBarcode.bind(this);
        this.setBarcode = this.setBarcode.bind(this);
        this.saveAndContinue = this.saveAndContinue.bind(this);
        this.setAlert = debounce(this.setAlert.bind(this), 2000);
        this.setBarcodePrefixOption = this.setBarcodePrefixOption.bind(this);
        this.setImagingSessionOption = this.setImagingSessionOption.bind(this);
        this.setLabkeyBarcodeSelectorOption = this.setLabkeyBarcodeSelectorOption.bind(this);
        this.toggleCreateBarcodeForm = this.toggleCreateBarcodeForm.bind(this);

        ipcRenderer.on(PLATE_CREATED, (event: any, barcode: string) => {
            this.props.selectBarcode(barcode);
        });
    }

    public componentDidMount() {
        this.props.getImagingSessions();
        this.props.getBarcodePrefixes();
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
                <a href="#" className={styles.createBarcodeLink} onClick={this.toggleCreateBarcodeForm}>
                    I don't have a barcode
                </a>
                {this.state.showCreateBarcodeForm ? this.renderBarcodeForm() : <div/>}
                {this.renderPlateOptions()}
            </FormPage>
        );
    }

    private renderBarcodeForm = (): JSX.Element | null => {
        const { barcodePrefix, imagingSession } = this.state;
        const { barcodePrefixes, imagingSessions } = this.props;

        return (
            <Row>
                <Col xs={8} md={10}>
                    <LabKeyOptionSelector
                        required={true}
                        label="Barcode Prefix"
                        optionIdKey="prefixId"
                        optionNameKey="description"
                        selected={barcodePrefix}
                        onOptionSelection={this.setBarcodePrefixOption}
                        options={barcodePrefixes}
                        placeholder="Select Barcode Prefix"
                    />
                </Col>
                <Col xs={8} md={10}>
                    <LabKeyOptionSelector
                        creatable={true}
                        label="Imaging Session"
                        optionIdKey="imagingSessionId"
                        optionNameKey="name"
                        selected={imagingSession}
                        onOptionSelection={this.setImagingSessionOption}
                        options={imagingSessions}
                        placeholder="Select or Create Imaging Session"
                    />
                </Col>
                <Col xs={8} md={4}>
                    <Button
                        disabled={!barcodePrefix}
                        onClick={this.createBarcode}
                        size="large"
                        style={{ float: "right", marginTop: "24px" }}
                        type="primary"
                    >Create
                    </Button>
                </Col>
            </Row>
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
                            <Radio.Button value={id || "None"} key={option}>
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

    private setLabkeyBarcodeSelectorOption(option: LabkeyBarcodeSelectorOption | null): void {
        this.setState(option);
    }

    private setBarcodePrefixOption(barcodePrefix: BarcodePrefix | null ): void {
        this.setState({ barcodePrefix: barcodePrefix || undefined });
    }

    private setImagingSessionOption(imagingSession: ImagingSession | null): void {
        this.setState({ imagingSession: imagingSession || undefined });
    }

    private toggleCreateBarcodeForm(): void {
        this.setState({ showCreateBarcodeForm: !this.state.showCreateBarcodeForm });
    }

    private getImagingSessionName = (id: number | null) => {
        if (id == null) {
            return "None";
        }

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
            const imagingSessionIdsWithInfo = imagingSessionIds.filter((i) => i !== null  && !!imagingSessions[i]);
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

    private createBarcode(): void {
        const { barcodePrefix, imagingSession } = this.state;
        if (barcodePrefix) {
            this.toggleCreateBarcodeForm();
            this.props.createBarcode(barcodePrefix.prefixId, imagingSession);
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
        const plateSelected = multipleOptions ? barcode && imagingSessionId !== undefined : barcode;
        return !plateSelected || saveInProgress;
    }
}

function mapStateToProps(state: State) {
    return {
        barcodePrefixes: getBarcodePrefixes(state),
        imagingSessions: getImagingSessions(state),
        saveInProgress: getRequestsInProgressContains(state, AsyncRequest.GET_PLATE),
        selectedBarcode: getSelectedBarcode(state),
        selectedBarcodePrefix: getSelectedBarcodePrefix(state),
        selectedImagingSession: getSelectedImagingSession(state),
        selectedImagingSessionId: getSelectedImagingSessionId(state),
        selectedImagingSessionIds: getSelectedImagingSessionIds(state),
    };
}

const dispatchToPropsMap = {
    createBarcode,
    getBarcodePrefixes: requestBarcodePrefixes,
    getImagingSessions: requestImagingSessions,
    goBack,
    selectBarcode,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(EnterBarcode);
