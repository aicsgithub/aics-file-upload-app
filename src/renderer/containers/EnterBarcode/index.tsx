import { Button, Col, Icon, Radio, Row, Select } from "antd";
import { SelectValue } from "antd/es/select";
import { RadioChangeEvent } from "antd/lib/radio";
import { AxiosError } from "axios";
import { ipcRenderer } from "electron";
import { debounce, get, uniqBy } from "lodash";
import * as memoize from "memoizee";
import { ReactNodeArray } from "react";
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
    requestImagingSessions,
    requestPlatesByBarcode,
} from "../../state/metadata/actions";
import { getBarcodePrefixes, getImagingSessions } from "../../state/metadata/selectors";
import {
    BarcodePrefix,
    CreateBarcodeAction,
    GetBarcodePrefixesAction,
    GetImagingSessionsAction,
    ImagingSession,
} from "../../state/metadata/types";
import {
    goBack,
    goForward,
    selectBarcode,
    selectWorkflowPath
} from "../../state/selection/actions";
import {
    getSelectedBarcode,
    getSelectedImagingSessionId,
    getSelectedImagingSessionIds
} from "../../state/selection/selectors";
import {
    GoBackAction,
    NextPageAction,
    SelectBarcodeAction,
    SelectWorkflowPathAction
} from "../../state/selection/types";
import { getLimsUrl } from "../../state/setting/selectors";
import { State } from "../../state/types";
import LabkeyClient from "../../util/labkey-client";
import { LabkeyPlateResponse } from "../../util/labkey-client/types";

const styles = require("./style.pcss");

interface LabkeyBarcodeSelectorOption {
    barcode: string;
    imagingSessionIds: Array<number | null>;
}

interface EnterBarcodeProps {
    barcodePrefixes: BarcodePrefix[];
    className?: string;
    createBarcode: ActionCreator<CreateBarcodeAction>;
    // get the most recent list of all imaging sessions in the db
    getImagingSessions: ActionCreator<GetImagingSessionsAction>;
    getBarcodePrefixes: ActionCreator<GetBarcodePrefixesAction>;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    imagingSessions: ImagingSession[];
    limsUrl: string;
    saveInProgress: boolean;
    selectBarcode: ActionCreator<SelectBarcodeAction>;
    selectedBarcode?: string;
    // undefined means that the user did not select an imaging session id. null means that the user chose
    // a plate without an imaging session id (when other imaging sessions were available)
    selectedImagingSessionId?: number | null;
    // all imaging session ids that are associated with the selectedBarcode
    selectedImagingSessionIds: Array<number | null>;
    selectWorkflowPath: ActionCreator<SelectWorkflowPathAction>;
    setAlert: ActionCreator<SetAlertAction>;
}

interface EnterBarcodeState {
    barcode?: string;
    barcodes: LabkeyBarcodeSelectorOption[];
    barcodePrefix?: BarcodePrefix;
    imagingSessionId?: number | null;
    imagingSessionIds: Array<number | null>;
    loadingBarcodes: boolean;
    showCreateBarcodeForm: boolean;
}

export const createOptionsFromGetPlatesResponse = memoize((allPlates: LabkeyPlateResponse[]) => {
    const uniquePlateBarcodes = uniqBy(allPlates, "barcode");
    return  uniquePlateBarcodes.map((plate) => {
        const imagingSessionIds = allPlates
            .filter((otherPlate) => otherPlate.barcode === plate.barcode)
            .map((p) => p.imagingSessionId);
        return {
            barcode: plate.barcode,
            imagingSessionIds,
        };
    });
});

class EnterBarcode extends React.Component<EnterBarcodeProps, EnterBarcodeState> {
    private searchForPlates = memoize((barcodeFragment: string, limsUrl: string): Promise<LabkeyPlateResponse[]> =>
        LabkeyClient.getPlatesByBarcode(`${limsUrl}/labkey`, barcodeFragment)
    );

    constructor(props: EnterBarcodeProps) {
        super(props);
        this.state = {
            barcode: props.selectedBarcode,
            barcodes: [],
            imagingSessionId: props.selectedImagingSessionId,
            imagingSessionIds: props.selectedImagingSessionIds,
            loadingBarcodes: false,
            showCreateBarcodeForm: false,
        };
        this.onBarcodeChange = this.onBarcodeChange.bind(this);
        this.saveAndContinue = this.saveAndContinue.bind(this);
        this.setAlert = debounce(this.setAlert.bind(this), 2000);
        this.onBarcodeInput = debounce(this.onBarcodeInput, 500);

        ipcRenderer.on(PLATE_CREATED, (event: any, barcode: string, imagingSessionId: number | null) => {
            this.props.selectBarcode(barcode, [imagingSessionId], imagingSessionId);
            this.searchForPlates.clear(); // clear all cached barcodes in order for plate to be searchable
        });
    }

    public componentDidMount() {
        this.props.getImagingSessions();
        this.props.getBarcodePrefixes();
    }

    public componentDidUpdate(prevProps: Readonly<EnterBarcodeProps>): void {
        if (prevProps.limsUrl !== this.props.limsUrl) {
            this.setState({
                barcode: undefined,
                barcodes: [],
                imagingSessionId: undefined,
                imagingSessionIds: [],
                loadingBarcodes: false,
                showCreateBarcodeForm: false,
            });
            this.props.getImagingSessions();
            this.props.getBarcodePrefixes();
        }
    }

    public render() {
        const {barcode, barcodes, loadingBarcodes} = this.state;
        const {className, saveInProgress} = this.props;
        const options: ReactNodeArray = barcodes.map((option: LabkeyBarcodeSelectorOption) => (
            <Select.Option key={option.barcode}>{option.barcode}</Select.Option>
        ));
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
                <div>Plate Barcode <span className={styles.asterisk}>*</span></div>
                <Select
                    suffixIcon={<Icon type="search"/>}
                    allowClear={true}
                    className={styles.select}
                    showSearch={true}
                    showArrow={false}
                    notFoundContent={null}
                    value={barcode}
                    placeholder="Barcode"
                    autoFocus={true}
                    autoClearSearchValue={true}
                    onChange={this.onBarcodeChange}
                    onSearch={this.onBarcodeInput}
                    loading={loadingBarcodes}
                    defaultActiveFirstOption={false}
                >
                    {options}
                </Select>
                <a href="#" className={styles.createBarcodeLink} onClick={this.showCreateBarcodeForm}>
                    I don't have a barcode
                </a>
                <a href="#" className={styles.createBarcodeLink} onClick={this.props.selectWorkflowPath}>
                    Associate by Workflow instead of Plate
                </a>
                {this.state.showCreateBarcodeForm ? this.renderBarcodeForm() : null}
                {this.renderPlateOptions()}
            </FormPage>
        );
    }

    private renderBarcodeForm = (): JSX.Element | null => {
        const { barcodePrefix } = this.state;
        const { barcodePrefixes } = this.props;

        return (
            <Row className={styles.createBarcodeForm}>
                <Col xs={16} md={20}>
                    <div>Barcode Prefix <span className={styles.asterisk}>*</span></div>
                    <Select
                        className={styles.select}
                        value={barcodePrefix}
                        onSelect={this.setBarcodePrefixOption}
                        placeholder="Select Barcode Prefix"
                    >
                        {barcodePrefixes.map((prefix) => (
                            <Select.Option value={prefix.prefixId} key={prefix.prefixId}>
                                {prefix.description}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={8} md={4}>
                    <Button
                        className={styles.createBarcodeButton}
                        disabled={!barcodePrefix}
                        onClick={this.createBarcode}
                        size="large"
                        type="primary"
                    >Create
                    </Button>
                </Col>
            </Row>
        );
    }

    private onBarcodeInput = async (input: string): Promise<void> => {
        if (input) {
            const { limsUrl } = this.props;
            this.setState({loadingBarcodes: true});

            try {
                const plates = await this.searchForPlates(input, limsUrl);
                const barcodes = createOptionsFromGetPlatesResponse(plates);
                this.setState({barcodes, loadingBarcodes: false});
            } catch (e) {
                this.props.setAlert({
                    message: e,
                    type: AlertType.ERROR,
                });
                this.setState({loadingBarcodes: false});
            }

        } else {
            this.setState({barcodes: []});
        }
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

    private setBarcodePrefixOption = (barcodePrefix?: BarcodePrefix | null ) => {
        this.setState({ barcodePrefix: barcodePrefix || undefined });
    }

    private showCreateBarcodeForm = () => {
        this.setState({
            barcode: undefined,
            barcodePrefix: undefined,
            imagingSessionId: undefined,
            imagingSessionIds: [],
            showCreateBarcodeForm: true,
        });
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

    private onBarcodeChange(value: SelectValue): void {
        if (value) {
            this.setState({
                barcode: value as string,
                barcodePrefix: undefined,
                imagingSessionId: undefined,
                showCreateBarcodeForm: false,
            });
        } else {
            this.setState({
                barcode: undefined,
                imagingSessionIds: [],
            });
        }
    }

    private createBarcode = () => {
        const { barcodePrefix } = this.state;
        if (barcodePrefix) {
            this.setState({showCreateBarcodeForm: false});
            this.props.createBarcode(barcodePrefix);
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
        limsUrl: getLimsUrl(state),
        saveInProgress: getRequestsInProgressContains(state, AsyncRequest.GET_PLATE),
        selectedBarcode: getSelectedBarcode(state),
        selectedImagingSessionId: getSelectedImagingSessionId(state),
        selectedImagingSessionIds: getSelectedImagingSessionIds(state),
    };
}

const dispatchToPropsMap = {
    createBarcode,
    getBarcodePrefixes: requestBarcodePrefixes,
    getImagingSessions: requestImagingSessions,
    getPlatesByBarcode: requestPlatesByBarcode,
    goBack,
    goForward,
    selectBarcode,
    selectWorkflowPath,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(EnterBarcode);
