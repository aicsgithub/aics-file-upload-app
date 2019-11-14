import { Button, Col, Icon, Radio, Row, Select } from "antd";
import { SelectValue } from "antd/es/select";
import { RadioChangeEvent } from "antd/lib/radio";
import { AxiosError } from "axios";
import { ipcRenderer } from "electron";
import { debounce, get } from "lodash";
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
    requestBarcodeSearchResults,
} from "../../state/metadata/actions";
import {
    getBarcodePrefixes,
    getImagingSessions,
    getUniqueBarcodeSearchResults,
} from "../../state/metadata/selectors";
import {
    BarcodePrefix,
    CreateBarcodeAction,
    GetBarcodeSearchResultsAction,
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
    Page,
    SelectBarcodeAction,
    SelectWorkflowPathAction
} from "../../state/selection/types";
import { State } from "../../state/types";

const styles = require("./style.pcss");

export interface BarcodeSelectorOption {
    barcode: string;
    imagingSessionIds: Array<number | null>;
}

interface EnterBarcodeProps {
    barcodePrefixes: BarcodePrefix[];
    barcodeSearchResults: BarcodeSelectorOption[];
    className?: string;
    createBarcode: ActionCreator<CreateBarcodeAction>;
    getBarcodeSearchResults: ActionCreator<GetBarcodeSearchResultsAction>;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    imagingSessions: ImagingSession[];
    loadingBarcodes: boolean;
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
    barcodePrefixId?: number;
    imagingSessionId?: number | null;
    imagingSessionIds: Array<number | null>;
    showCreateBarcodeForm: boolean;
}

class EnterBarcode extends React.Component<EnterBarcodeProps, EnterBarcodeState> {
    private onBarcodeInput = debounce((input: string): void => {
        this.props.getBarcodeSearchResults(input);
    }, 500);

    constructor(props: EnterBarcodeProps) {
        super(props);
        this.state = {
            barcode: props.selectedBarcode,
            imagingSessionId: props.selectedImagingSessionId,
            imagingSessionIds: props.selectedImagingSessionIds,
            showCreateBarcodeForm: false,
        };
        this.onBarcodeChange = this.onBarcodeChange.bind(this);
        this.saveAndContinue = this.saveAndContinue.bind(this);
        this.setAlert = debounce(this.setAlert.bind(this), 2000);

        ipcRenderer.on(PLATE_CREATED, (event: any, barcode: string, imagingSessionId: number | null) => {
            this.props.selectBarcode(barcode, [imagingSessionId], imagingSessionId);
        });
    }

    public render() {
        const {barcode} = this.state;
        const {barcodeSearchResults, className, loadingBarcodes, saveInProgress} = this.props;
        const options: ReactNodeArray = barcodeSearchResults.map((option: BarcodeSelectorOption) => (
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
                page={Page.EnterBarcode}
            >
                <div>Plate Barcode <span className={styles.asterisk}>*</span></div>
                <Select
                    suffixIcon={<Icon type="search"/>}
                    allowClear={true}
                    className={styles.select}
                    showSearch={true}
                    showArrow={false}
                    notFoundContent={<div>Start typing to search for barcodes</div>}
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
        const { barcodePrefixId } = this.state;
        const { barcodePrefixes } = this.props;

        return (
            <Row className={styles.createBarcodeForm}>
                <Col xs={16} md={20}>
                    <div>Barcode Prefix <span className={styles.asterisk}>*</span></div>
                    <Select
                        autoFocus={true}
                        className={styles.select}
                        value={barcodePrefixId}
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
                        disabled={!barcodePrefixId}
                        onClick={this.createBarcode}
                        size="large"
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

    private setBarcodePrefixOption = (barcodePrefixId?: number | null ) => {
        this.setState({ barcodePrefixId: barcodePrefixId || undefined });
    }

    private showCreateBarcodeForm = () => {
        this.setState({
            barcode: undefined,
            barcodePrefixId: undefined,
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
            const matchingResult = this.props.barcodeSearchResults
                .filter((r: BarcodeSelectorOption) => r.barcode === value);
            const imagingSessionIds = matchingResult.length > 0 ? matchingResult[0].imagingSessionIds : [];
            this.setState({
                barcode: value as string,
                barcodePrefixId: undefined,
                imagingSessionId: undefined,
                imagingSessionIds,
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
        const { barcodePrefixId } = this.state;
        if (barcodePrefixId) {
            const barcodePrefix = this.props.barcodePrefixes.find((option) => option.prefixId === barcodePrefixId);
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
        barcodeSearchResults: getUniqueBarcodeSearchResults(state),
        imagingSessions: getImagingSessions(state),
        loadingBarcodes: getRequestsInProgressContains(state, AsyncRequest.GET_BARCODE_SEARCH_RESULTS),
        saveInProgress: getRequestsInProgressContains(state, AsyncRequest.GET_PLATE),
        selectedBarcode: getSelectedBarcode(state),
        selectedImagingSessionId: getSelectedImagingSessionId(state),
        selectedImagingSessionIds: getSelectedImagingSessionIds(state),
    };
}

const dispatchToPropsMap = {
    createBarcode,
    getBarcodeSearchResults: requestBarcodeSearchResults,
    goBack,
    goForward,
    selectBarcode,
    selectWorkflowPath,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(EnterBarcode);
