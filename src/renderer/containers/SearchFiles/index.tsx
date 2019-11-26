import { FileToFileMetadata, TableInfo } from "@aics/aicsfiles/type-declarations/types";
import { Button, Col, Icon, Input, Row, Select, Table } from "antd";
import { remote } from "electron";
import { map } from "lodash";
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
    getFileMetadataSearchResultsAsTable,
    getOptionsForLookup
} from "../../state/metadata/selectors";
import {
    ExportFileMetadataAction,
    GetAnnotationsAction,
    GetOptionsForLookupAction,
    SearchFileMetadataAction
} from "../../state/metadata/types";
import { Page } from "../../state/route/types";
import { Annotation, AnnotationLookup } from "../../state/template/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

const DATASET = "Dataset";

interface Props {
    annotationLookups: AnnotationLookup[];
    annotations: Annotation[];
    className?: string;
    exportFileMetadataCSV: ActionCreator<ExportFileMetadataAction>;
    exportingCSV: boolean;
    optionsForLookup?: string[];
    optionsForLookupLoading: boolean;
    requestAnnotations: ActionCreator<GetAnnotationsAction>;
    retrieveOptionsForLookup: ActionCreator<GetOptionsForLookupAction>;
    searchFileMetadata: ActionCreator<SearchFileMetadataAction>;
    searchLoading: boolean;
    searchResults?: FileToFileMetadata;
    searchResultsAsTable?: TableInfo;
    setAlert: ActionCreator<SetAlertAction>;
}

interface SearchFilesState {
    annotation?: string;
    isLookup: boolean;
    searchValue?: string;
    selectedJobId?: string;
}

interface FileMetadataRow {
    [key: string]: string | number;
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
    }

    public componentDidUpdate(prevProps: Props): void {
        // Set default annotation to Dataset
        if (this.props.annotations && this.props.annotations.length && !this.state.annotation) {
            this.selectAnnotation(DATASET);
        }
    }

    public render() {
        const {
            annotations,
            className,
            exportingCSV,
            optionsForLookup,
            optionsForLookupLoading,
            searchResults,
            searchLoading,
        } = this.props;
        const { annotation, searchValue, isLookup } = this.state;
        const fileIds = searchResults && Object.keys(searchResults);
        return (
            <FormPage
                className={className}
                formTitle="SEARCH FOR FILES"
                formPrompt="Select an annotation and search value to find and export matching files and their metadata"
                saveButtonName={"Export CSV"}
                onSave={this.exportCSV}
                saveButtonDisabled={!fileIds || !fileIds.length || exportingCSV}
                page={Page.SearchFiles}
            >
                <Row>
                    <Button
                        disabled={searchLoading}
                        onClick={this.refreshTab}
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
                            {isLookup ? (
                                <Select
                                    allowClear={true}
                                    showSearch={true}
                                    value={searchValue}
                                    loading={!optionsForLookup || optionsForLookupLoading}
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
                            loading={searchLoading || exportingCSV}
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
                {fileIds && (
                    <Row>
                        <p>Search found {fileIds.length} files matching query.</p>
                    </Row>
                )}
                {this.renderSearchResults()}
            </FormPage>
        );
    }

    private renderSearchResults = (): JSX.Element | null => {
        const { searchResultsAsTable } = this.props;
        if (!searchResultsAsTable) {
            return null;
        }
        const { annotationToColumnMap, imageModelToFileMetadata } = searchResultsAsTable;
        const headerInfo = Object.keys(annotationToColumnMap);
        const header = headerInfo.map((annotation) => ({
            dataIndex: annotation,
            key: annotation,
            title: annotation,
        }));
        // Map each ImageModel metadata row into a antd Table row
        const bodyInfo = map(imageModelToFileMetadata, (row, key) => (
            // Reduce the row of value arrays into an object where the key is the column name
            row.reduce((allMetadataForRow: FileMetadataRow, metadata: Array<string | number>, index: number) => ({
                ...allMetadataForRow,
                [headerInfo[index]]: metadata.join(", "),
            }), { key })
        ));
        return <Table dataSource={bodyInfo} columns={header} />;
    }

    private selectSearchValue = (searchValue: string) => {
        this.setState({ searchValue });
    }

    private setSearchValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.selectSearchValue(e.target.value);
    }

    // The user may have created annotations in between when this tab is created and now
    private refreshTab = () => {
        this.props.requestAnnotations();
        this.selectAnnotation(this.state.annotation || DATASET);
    }

    private retrieveOptionsForLookup = (lookupId: number) => {
        this.props.retrieveOptionsForLookup(lookupId);
    }

    private selectAnnotation = (annotation: string): void => {
        const { annotations, annotationLookups } = this.props;
        const annotationOption = annotations.find(({ name }) => name === annotation);
        const lookup = annotationOption &&
            annotationLookups.find(({ annotationId }) => annotationId === annotationOption.annotationId);
        if (lookup) {
            this.retrieveOptionsForLookup(lookup.lookupId);
        }
        this.setState({ annotation, isLookup: !!lookup, searchValue: undefined });
    }

    private searchForFiles = () => {
        const { annotation, searchValue } = this.state;
        this.props.searchFileMetadata(annotation, searchValue);
    }

    private exportCSV = () => {
        remote.dialog.showSaveDialog({
            buttonLabel: "Save",
            defaultPath: "FileMetadata.csv",
            filters: [
                { name: "CSV files", extensions: ["csv"] },
            ],
            title: "Save File Metadata as CSV",
        }, (fileName: string = "FileMetadata.csv") => {
            let actualFileName = fileName;
            if (actualFileName.length < 4 || actualFileName.slice(-4) !== ".csv") {
                actualFileName += ".csv";
            }
            this.props.exportFileMetadataCSV(actualFileName);
        });
    }
}

function mapStateToProps(state: State) {
    return {
        annotationLookups: getAnnotationLookups(state),
        annotations: getAnnotations(state),
        exportingCSV: getRequestsInProgressContains(state, AsyncRequest.EXPORT_FILE_METADATA),
        optionsForLookup: getOptionsForLookup(state),
        optionsForLookupLoading: getRequestsInProgressContains(state, AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
        searchLoading: getRequestsInProgressContains(state, AsyncRequest.SEARCH_FILE_METADATA),
        searchResults: getFileMetadataSearchResults(state),
        searchResultsAsTable: getFileMetadataSearchResultsAsTable(state),
    };
}

const dispatchToPropsMap = {
    exportFileMetadataCSV,
    requestAnnotations,
    retrieveOptionsForLookup,
    searchFileMetadata,
    setAlert,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SearchFiles);
