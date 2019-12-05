import { Button, Col, Icon, Input, Row, Select, Table } from "antd";
import { remote } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import FormPage from "../../components/FormPage";

import LabeledInput from "../../components/LabeledInput";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest, SetAlertAction } from "../../state/feedback/types";
import {
    exportFileMetadataCSV,
    requestAnnotations,
    retrieveOptionsForLookup,
    searchFileMetadata
} from "../../state/metadata/actions";
import {
    getAnnotationLookups,
    getAnnotations,
    getFileMetadataSearchResults,
    getNumberOfFiles,
    getOptionsForLookup,
    getSearchResultsAsTable
} from "../../state/metadata/selectors";
import {
    ExportFileMetadataAction,
    GetAnnotationsAction,
    GetOptionsForLookupAction,
    SearchFileMetadataAction,
    SearchResultsTable
} from "../../state/metadata/types";
import { Page } from "../../state/route/types";
import { selectAnnotation } from "../../state/selection/actions";
import { getAnnotation } from "../../state/selection/selectors";
import { SelectAnnotationAction } from "../../state/selection/types";
import { Annotation, AnnotationLookup } from "../../state/template/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
    annotation: string;
    annotationLookups: AnnotationLookup[];
    annotations: Annotation[];
    className?: string;
    numberOfFilesFound: number;
    exportFileMetadataCSV: ActionCreator<ExportFileMetadataAction>;
    exportingCSV: boolean;
    optionsForLookup?: string[];
    optionsForLookupLoading: boolean;
    requestAnnotations: ActionCreator<GetAnnotationsAction>;
    retrieveOptionsForLookup: ActionCreator<GetOptionsForLookupAction>;
    searchFileMetadata: ActionCreator<SearchFileMetadataAction>;
    searchLoading: boolean;
    searchResultsAsTable?: SearchResultsTable;
    selectAnnotation: ActionCreator<SelectAnnotationAction>;
    setAlert: ActionCreator<SetAlertAction>;
}

interface SearchFilesState {
    isLookup: boolean;
    searchValue?: string;
    selectedJobId?: string;
}

/*
    This container represents the Search Files tab, in this tab the user can query for files and their metadata
    by annotation name and value returning all files that have a matching name and value somewhere in their custom
    metadata.
 */
class SearchFiles extends React.Component<Props, SearchFilesState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            isLookup: false,
        };
    }

    public componentDidMount(): void {
        this.props.requestAnnotations();
        this.props.retrieveOptionsForLookup(this.props.annotation);
    }

    public render() {
        const {
            annotation,
            annotations,
            className,
            numberOfFilesFound,
            exportingCSV,
            optionsForLookup,
            optionsForLookupLoading,
            searchLoading,
            searchResultsAsTable,
        } = this.props;
        const { searchValue } = this.state;
        return (
            <FormPage
                className={className}
                formTitle="SEARCH FOR FILES"
                formPrompt="Select an annotation and search value to find and export matching files and their metadata"
                saveButtonName={"Export CSV"}
                onSave={this.exportCSV}
                saveButtonDisabled={!numberOfFilesFound || exportingCSV}
                page={Page.SearchFiles}
            >
                <Row>
                    <Button
                        disabled={searchLoading}
                        onClick={this.props.requestAnnotations}
                        className={styles.refreshButton}
                    ><Icon type="sync" />Refresh Annotations
                    </Button>
                </Row>
                <Row gutter={8} className={styles.fullWidth}>
                    <Col xs={6}>
                        <LabeledInput label="Annotation">
                            <Select
                                showSearch={true}
                                value={annotation}
                                loading={!annotations.length}
                                disabled={!annotations.length}
                                onChange={this.selectAnnotation}
                                placeholder="Select Annotation"
                                className={styles.fullWidth}
                            >
                                {annotations.map(({ annotationId, name }) => (
                                    <Select.Option key={annotationId} value={name}>
                                        {name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </LabeledInput>
                    </Col>
                    <Col xs={12} xl={14} xxl={15}>
                        <LabeledInput label="Search Value">
                            {(optionsForLookupLoading || optionsForLookup) ? (
                                <Select
                                    allowClear={true}
                                    showSearch={true}
                                    value={searchValue}
                                    loading={optionsForLookupLoading}
                                    disabled={!optionsForLookup || optionsForLookupLoading}
                                    onChange={this.selectSearchValue}
                                    placeholder="Select Search Value"
                                    className={styles.fullWidth}
                                >
                                    {optionsForLookup && optionsForLookup.map((option) => (
                                        <Select.Option key={option} value={option}>{option}</Select.Option>
                                    ))}
                                </Select>
                            ) : (
                                <Input
                                    allowClear={true}
                                    disabled={!annotation}
                                    value={searchValue}
                                    onChange={this.setSearchValue}
                                    onPressEnter={this.searchForFiles}
                                    placeholder="Enter Search Value"
                                />
                            )}
                        </LabeledInput>
                    </Col>
                    <Col xs={6} xl={4} xxl={3}>
                        <Button
                            loading={searchLoading}
                            disabled={!annotation || !searchValue || searchLoading || exportingCSV}
                            size="large"
                            type="primary"
                            onClick={this.searchForFiles}
                            className={styles.searchButton}
                        ><Icon type="search" /> Search
                        </Button>
                    </Col>
                </Row>
                {searchLoading && <p>Searching...</p>}
                {exportingCSV && <p>Exporting...</p>}
                {!!numberOfFilesFound && (
                    <Row>
                        <p>Search found {numberOfFilesFound} files matching query.</p>
                    </Row>
                )}
                {searchResultsAsTable && (
                    <Table dataSource={searchResultsAsTable.rows} columns={searchResultsAsTable.header} />
                )}
            </FormPage>
        );
    }

    private selectAnnotation = (annotation: string) => {
        this.props.selectAnnotation(annotation);
        this.props.retrieveOptionsForLookup(annotation);
        this.setState({ searchValue: undefined });
    }

    private selectSearchValue = (searchValue: string) => {
        this.setState({ searchValue });
    }

    private setSearchValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.selectSearchValue(e.target.value);
    }

    private searchForFiles = () => {
        this.props.searchFileMetadata(this.props.annotation, this.state.searchValue);
    }

    private exportCSV = () => {
        remote.dialog.showSaveDialog({
            buttonLabel: "Save",
            defaultPath: "FileMetadata.csv",
            filters: [
                { name: "CSV files", extensions: ["csv"] },
            ],
            title: "Save File Metadata as CSV",
        }, (fileName?: string) => {
            if (fileName) {
                let actualFileName = fileName;
                if (actualFileName.length < 4 || actualFileName.slice(-4) !== ".csv") {
                    actualFileName += ".csv";
                }
                this.props.exportFileMetadataCSV(actualFileName);
            }
        });
    }
}

function mapStateToProps(state: State) {
    return {
        annotation: getAnnotation(state),
        annotationLookups: getAnnotationLookups(state),
        annotations: getAnnotations(state),
        exportingCSV: getRequestsInProgressContains(state, AsyncRequest.EXPORT_FILE_METADATA),
        numberOfFilesFound: getNumberOfFiles(state),
        optionsForLookup: getOptionsForLookup(state),
        optionsForLookupLoading: getRequestsInProgressContains(state, AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
        searchLoading: getRequestsInProgressContains(state, AsyncRequest.SEARCH_FILE_METADATA),
        searchResults: getFileMetadataSearchResults(state),
        searchResultsAsTable: getSearchResultsAsTable(state),
    };
}

const dispatchToPropsMap = {
    exportFileMetadataCSV,
    requestAnnotations,
    retrieveOptionsForLookup,
    searchFileMetadata,
    selectAnnotation,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SearchFiles);
