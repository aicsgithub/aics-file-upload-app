import { Col, Row } from "antd";
import { SelectValue } from "antd/es/select";
import { RadioChangeEvent } from "antd/lib/radio";
import { AxiosError } from "axios";
import { ipcRenderer } from "electron";
import { debounce } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { PLATE_CREATED } from "../../../shared/constants";

import FormPage from "../../components/FormPage";
import CreateBarcodeCard from "../../components/SelectPath/CreateBarcodeCard";
import EnterBarcodeCard from "../../components/SelectPath/EnterBarcodeCard";
import SelectWorkflowCard from "../../components/SelectPath/SelectWorkflowCard";
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

// The different upload paths a user may take
enum Path {
    EnterBarcode = 1, // The user already has a plate barcode and can associate wells
    CreateBarcode = 2, // No plate, but can create one and can associate wells
    Workflow = 3, // No plate or ability to create one, but can associate with workflows
}

interface SelectUploadTypeProps {
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

interface SelectUploadTypeState {
    barcode?: string;
    barcodePrefixId?: number;
    imagingSessionId?: number | null;
    imagingSessionIds: Array<number | null>;
    path?: Path;
}

/*
    This container represents the SelectUploadType page. On this page a user will be presented with different options
    representing the different ways they may associate data with their files. While later on they will be able to
    associate custom data regardless, it is important for us to at least require some minimum data to be able to query.
 */
class SelectUploadType extends React.Component<SelectUploadTypeProps, SelectUploadTypeState> {
    private onBarcodeInput = debounce((input: string): void => {
        this.props.getBarcodeSearchResults(input);
    }, 500);

    constructor(props: SelectUploadTypeProps) {
        super(props);
        this.state = {
            barcode: props.selectedBarcode,
            imagingSessionId: props.selectedImagingSessionId,
            imagingSessionIds: props.selectedImagingSessionIds,
            path: props.selectedBarcode ? Path.EnterBarcode : undefined,
        };
        this.onBarcodeChange = this.onBarcodeChange.bind(this);
        this.saveAndContinue = this.saveAndContinue.bind(this);
        this.setAlert = debounce(this.setAlert.bind(this), 2000);

        // During the "Create Barcode" path the user will create a plate, triggering this. From here we can proceed
        // to associating files and wells, note this will now become essentially the same path as "Enter Barcode"
        ipcRenderer.on(PLATE_CREATED, (event: any, barcode: string, imagingSessionId: number | null) => {
            this.props.selectBarcode(barcode, [imagingSessionId], imagingSessionId);
        });
    }

    public render() {
        const {
            barcodePrefixes,
            barcodeSearchResults,
            className,
            imagingSessions,
            loadingBarcodes,
            saveInProgress,
        } = this.props;
        const {
            barcode,
            barcodePrefixId,
            imagingSessionId,
            imagingSessionIds,
        } = this.state;
        return (
            <FormPage
                className={className}
                formTitle="SELECT UPLOAD TYPE"
                formPrompt="Choose how you want to associate data with your files. May only choose one."
                saveButtonDisabled={!this.state.path}
                onSave={this.saveAndContinue}
                saveInProgress={saveInProgress}
                onBack={this.props.goBack}
                page={Page.SelectUploadType}
            >
                <Row className={styles.cardRow} gutter={16}>
                    <Col span={8}>
                        <EnterBarcodeCard
                            barcode={barcode}
                            barcodeSearchResults={barcodeSearchResults}
                            imagingSessionId={imagingSessionId}
                            imagingSessionIds={imagingSessionIds}
                            imagingSessions={imagingSessions}
                            loadingBarcodes={loadingBarcodes}
                            onBarcodeChange={this.onBarcodeChange}
                            onBarcodeInput={this.onBarcodeInput}
                            onImagingSessionChanged={this.onImagingSessionChanged}
                            isSelected={this.state.path === Path.EnterBarcode}
                            onCancel={this.resetAndReplaceState}
                        />
                    </Col>
                    <Col span={8}>
                        <CreateBarcodeCard
                            barcodePrefixes={barcodePrefixes}
                            barcodePrefixId={barcodePrefixId}
                            onBarcodePrefixChanged={this.setBarcodePrefixOption}
                            isSelected={this.state.path === Path.CreateBarcode}
                            onCancel={this.resetAndReplaceState}
                        />
                    </Col>
                    <Col span={8}>
                        <SelectWorkflowCard
                            selectWorkflowPath={this.selectWorkflowPath}
                            isSelected={this.state.path === Path.Workflow}
                            onCancel={this.resetAndReplaceState}
                        />
                    </Col>
                </Row>
            </FormPage>
        );
    }

    private onBarcodeChange(value: SelectValue): void {
        let replacementState;
        if (value) {
            const matchingResult = this.props.barcodeSearchResults
                .filter((r: BarcodeSelectorOption) => r.barcode === value);
            const imagingSessionIds = matchingResult.length > 0 ? matchingResult[0].imagingSessionIds : [];
            replacementState = {
                barcode: value as string,
                imagingSessionIds,
                path: imagingSessionIds.length > 1 ? undefined : Path.EnterBarcode,
            };
        }
        this.resetAndReplaceState(replacementState);
    }

    private onImagingSessionChanged = (event: RadioChangeEvent) => {
        const imagingSessionId = event.target.value;
        this.setState({ imagingSessionId, path: Path.EnterBarcode });
    }

    private setBarcodePrefixOption = (barcodePrefixId?: number | null ) => {
        this.resetAndReplaceState({
            barcodePrefixId: barcodePrefixId || undefined,
            path: Path.CreateBarcode,
        });
    }

    private selectWorkflowPath = () => {
        this.resetAndReplaceState({ path: Path.Workflow });
    }

    // If a user causes an action in a card all other card must be reset to prevent the idea that you could
    // ever select > 1 path
    private resetAndReplaceState = (replacementState: Partial<SelectUploadTypeState> = {}) => {
        this.setState({
            barcode: undefined,
            barcodePrefixId: undefined,
            imagingSessionId: undefined,
            imagingSessionIds: [],
            path: undefined,
            ...replacementState,
        });
    }

    // Depending on the path chosen we need to cause a different action to be triggered
    private saveAndContinue(): void {
        const { barcode, barcodePrefixId, imagingSessionId, imagingSessionIds, path } = this.state;
        switch (path) {
            case Path.EnterBarcode:
                this.props.selectBarcode(barcode, imagingSessionIds, imagingSessionId);
                break;
            case Path.CreateBarcode:
                const barcodePrefix = this.props.barcodePrefixes.find((option) => option.prefixId === barcodePrefixId);
                this.props.createBarcode(barcodePrefix);
                break;
            case Path.Workflow:
                this.props.selectWorkflowPath();
        }
    }

    private setAlert(error: AxiosError): void {
        this.props.setAlert({
            message: error.message,
            statusCode: error.response ? error.response.status : undefined,
            type: AlertType.ERROR,
        });
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

export default connect(mapStateToProps, dispatchToPropsMap)(SelectUploadType);
