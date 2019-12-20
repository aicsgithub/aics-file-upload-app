import { Button, Checkbox, Col, Empty, Icon, Radio, Row, Table } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import CheckboxGroup, { CheckboxValueType } from "antd/es/checkbox/Group";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import { remote } from "electron";
import { map, startCase } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import FormPage from "../../components/FormPage";

import FileMetadataModal from "../../components/FileMetadataModal";
import LabeledInput from "../../components/LabeledInput";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest, SetAlertAction } from "../../state/feedback/types";
import {
    exportFileMetadataCSV,
    requestAnnotations,
    requestTemplates,
    retrieveOptionsForLookup,
    searchFileMetadata
} from "../../state/metadata/actions";
import { UNIMPORTANT_COLUMNS } from "../../state/metadata/constants";
import {
    getAnnotations,
    getFileMetadataSearchResults,
    getNumberOfFiles,
    getOptionsForLookup,
    getSearchResultsHeader,
    getTemplates,
    getUsers
} from "../../state/metadata/selectors";
import {
    ExportFileMetadataAction,
    GetAnnotationsAction,
    GetOptionsForLookupAction,
    GetTemplatesAction,
    SearchFileMetadataAction,
    SearchResultRow,
} from "../../state/metadata/types";
import { Page } from "../../state/route/types";
import { selectAnnotation, selectUser } from "../../state/selection/actions";
import { getAnnotation, getUser } from "../../state/selection/selectors";
import { SelectAnnotationAction, SelectUserAction } from "../../state/selection/types";
import { getAreAllMetadataColumnsSelected, getMetadataColumns } from "../../state/setting/selectors";
import { UpdateSettingsAction } from "../../state/setting/types";
import { Annotation } from "../../state/template/types";
import { State } from "../../state/types";
import { LabkeyTemplate, LabkeyUser } from "../../util/labkey-client/types";
import AnnotationForm from "./AnnotationForm";
import TemplateForm from "./TemplateForm";
import UserAndTemplateForm from "./UserAndTemplateForm";
import UserForm from "./UserForm";
import {updateSettings} from "../../state/setting/actions";

const styles = require("./styles.pcss");

enum SearchMode {
    ANNOTATION = "Annotation",
    USER = "User",
    TEMPLATE = "Template",
    USER_AND_TEMPLATE = "User & Template",
}

const searchModeOptions: SearchMode[] = map(SearchMode, (value) => value);
const EXTRA_COLUMN_OPTIONS = UNIMPORTANT_COLUMNS.map((value) => ({
    label: startCase(value),
    value,
}));

interface Props {
    allMetadataColumnsSelected: boolean;
    annotation: string;
    annotations: Annotation[];
    className?: string;
    numberOfFilesFound: number;
    exportFileMetadataCSV: ActionCreator<ExportFileMetadataAction>;
    exportingCSV: boolean;
    metadataColumns: string[];
    optionsForLookup?: string[];
    optionsForLookupLoading: boolean;
    requestAnnotations: ActionCreator<GetAnnotationsAction>;
    requestTemplates: ActionCreator<GetTemplatesAction>;
    retrieveOptionsForLookup: ActionCreator<GetOptionsForLookupAction>;
    searchFileMetadata: ActionCreator<SearchFileMetadataAction>;
    searchLoading: boolean;
    searchResults?: SearchResultRow[];
    searchResultsHeader?: Array<ColumnProps<SearchResultRow>>;
    selectAnnotation: ActionCreator<SelectAnnotationAction>;
    selectUser: ActionCreator<SelectUserAction>;
    setAlert: ActionCreator<SetAlertAction>;
    templates: LabkeyTemplate[];
    updateSettings: ActionCreator<UpdateSettingsAction>;
    user?: string;
    users: LabkeyUser[];
}

interface SearchFilesState {
    selectedRow?: SearchResultRow;
    searchMode: SearchMode;
    searchValue?: string;
    selectedJobId?: string;
    showExtraColumnOptions: boolean;
    template?: string;
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
            searchMode: SearchMode.ANNOTATION,
            showExtraColumnOptions: false,
        };
    }

    public componentDidMount(): void {
        this.props.requestAnnotations();
        this.props.requestTemplates();
        this.props.retrieveOptionsForLookup(this.props.annotation);
    }

    public render() {
        const {
            allMetadataColumnsSelected,
            className,
            numberOfFilesFound,
            exportingCSV,
            metadataColumns,
            searchLoading,
            searchResults,
            searchResultsHeader,
        } = this.props;
        const { selectedRow, searchMode, showExtraColumnOptions } = this.state;
        const tableTitle = () => `Search found ${numberOfFilesFound} files matching query`;
        return (
            <FormPage
                className={className}
                formTitle="SEARCH FOR FILES"
                formPrompt="Query for files and their metadata using one of the below search modes"
                saveButtonName={"Export CSV"}
                onSave={this.exportCSV}
                saveButtonDisabled={!numberOfFilesFound || exportingCSV}
                page={Page.SearchFiles}
            >
                <Row>
                    <Col xs={16}>
                        <LabeledInput label="Search Mode">
                            <Radio.Group buttonStyle="solid" onChange={this.selectSearchMode} value={searchMode}>
                                {searchModeOptions.map((option) => (
                                    <Radio.Button key={option} value={option}>{option}</Radio.Button>
                                ))}
                            </Radio.Group>
                        </LabeledInput>
                    </Col>
                    <Col xs={8}>
                        {searchMode === SearchMode.ANNOTATION && (
                            <Button
                                disabled={searchLoading}
                                onClick={requestAnnotations}
                                className={styles.refreshButton}
                            ><Icon type="sync" />Refresh Annotations
                            </Button>
                        )}
                        {(searchMode === SearchMode.TEMPLATE || searchMode === SearchMode.USER_AND_TEMPLATE) && (
                            <Button
                                disabled={searchLoading}
                                onClick={this.props.requestTemplates}
                                className={styles.refreshButton}
                            ><Icon type="sync" />Refresh Templates
                            </Button>
                        )}
                    </Col>
                </Row>
                <Row gutter={8} className={styles.fullWidth}>
                    {this.renderSearchForm()}
                </Row>
                {searchLoading && <p>Searching...</p>}
                {exportingCSV && <p>Exporting...</p>}
                {numberOfFilesFound > 0 && (
                    <>
                        <Row>
                            <p className={styles.includeExtraColumns} onClick={this.toggleShowExtraColumnOptions}>
                                Include Extra Columns{" "}
                                <Icon
                                    type={showExtraColumnOptions ? "caret-down" : "caret-up"}
                                />
                            </p>
                            {showExtraColumnOptions && (
                                <>
                                    <Checkbox
                                        className={styles.checkAll}
                                        onChange={this.toggleCheckAll}
                                        indeterminate={!allMetadataColumnsSelected && !!metadataColumns.length}
                                        checked={allMetadataColumnsSelected}
                                    >
                                        Check All
                                    </Checkbox>
                                    <CheckboxGroup
                                        value={metadataColumns}
                                        options={EXTRA_COLUMN_OPTIONS}
                                        onChange={this.setMetadataColumns}
                                    />
                                </>
                            )}
                        </Row>
                        <Table
                            dataSource={searchResults}
                            columns={searchResultsHeader}
                            title={tableTitle}
                            onRow={this.onRow}
                        />
                    </>
                )}
                {(searchResultsHeader && !numberOfFilesFound) && (
                    <Empty className={styles.empty} description="No files found matching your search criteria" />
                )}
                <FileMetadataModal
                    fileMetadata={selectedRow}
                    closeFileDetailModal={this.toggleFileDetailModal}
                />
            </FormPage>
        );
    }

    private renderSearchForm = (): JSX.Element => {
        const {
            annotation,
            annotations,
            exportingCSV,
            optionsForLookup,
            optionsForLookupLoading,
            searchLoading,
            templates,
            user,
            users,
        } = this.props;
        const { searchMode, searchValue, template } = this.state;
        if (searchMode === SearchMode.ANNOTATION) {
            return (
                <AnnotationForm
                    annotation={annotation}
                    annotations={annotations}
                    exportingCSV={exportingCSV}
                    optionsForLookup={optionsForLookup}
                    optionsForLookupLoading={optionsForLookupLoading}
                    onSearch={this.searchForFiles}
                    searchLoading={searchLoading}
                    searchValue={searchValue}
                    selectAnnotation={this.selectAnnotation}
                    selectSearchValue={this.selectSearchValue}
                    setSearchValue={this.setSearchValue}
                />);
        }
        if (searchMode === SearchMode.TEMPLATE) {
            return (
                <TemplateForm
                    exportingCSV={exportingCSV}
                    searchLoading={searchLoading}
                    onSearch={this.searchForFiles}
                    template={template}
                    templates={templates}
                    selectTemplate={this.selectTemplate}
                />);
        }
        if (searchMode === SearchMode.USER) {
            return (
                <UserForm
                    exportingCSV={exportingCSV}
                    searchLoading={searchLoading}
                    onSearch={this.searchForFiles}
                    user={user}
                    users={users}
                    selectUser={this.props.selectUser}
                />);
        }
        // searchMode === SearchMode.USER_AND_TEMPLATE
        return (
            <UserAndTemplateForm
                exportingCSV={exportingCSV}
                searchLoading={searchLoading}
                onSearch={this.searchForFiles}
                template={template}
                templates={templates}
                user={user}
                users={users}
                selectUser={this.props.selectUser}
                selectTemplate={this.selectTemplate}
            />);
    }

    private onRow = (row: SearchResultRow) => ({
        onClick: () => this.toggleFileDetailModal(undefined, row),
    })

    private toggleShowExtraColumnOptions = () => {
        this.setState({ showExtraColumnOptions: !this.state.showExtraColumnOptions });
    }

    private setMetadataColumns = (metadataColumns: CheckboxValueType[]) => {
        this.props.updateSettings({ metadataColumns })
    }

    private toggleCheckAll = (e: CheckboxChangeEvent) => {
        this.props.updateSettings({ metadataColumns: e.target.checked ? UNIMPORTANT_COLUMNS : [] });
    }

    private toggleFileDetailModal = (e?: any, selectedRow?: SearchResultRow): void => {
        this.setState({ selectedRow });
    }

    private selectTemplate = (template?: string): void => {
        this.setState({ template });
    }

    private selectSearchMode = (event: RadioChangeEvent): void => {
        this.setState({ searchMode: event.target.value as SearchMode });
    }

    private selectAnnotation = (annotation: string) => {
        this.props.selectAnnotation(annotation);
        this.props.retrieveOptionsForLookup(annotation);
        this.setState({ searchValue: undefined });
    }

    private selectSearchValue = (searchValue?: string) => {
        this.setState({ searchValue });
    }

    private setSearchValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.selectSearchValue(e.target.value);
    }

    private searchForFiles = () => {
        const { annotation, user } = this.props;
        const { searchMode, searchValue, template } = this.state;
        switch (searchMode) {
            case SearchMode.ANNOTATION:
                this.props.searchFileMetadata({ annotation, searchValue });
                return;
            case SearchMode.TEMPLATE:
                this.props.searchFileMetadata({ template });
                return;
            case SearchMode.USER:
                this.props.searchFileMetadata({ user });
                return;
            default: // case SearchMode.USER_AND_TEMPLATE:
                this.props.searchFileMetadata({ template, user });
                return;
        }
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
        allMetadataColumnsSelected: getAreAllMetadataColumnsSelected(state),
        annotation: getAnnotation(state),
        annotations: getAnnotations(state),
        exportingCSV: getRequestsInProgressContains(state, AsyncRequest.EXPORT_FILE_METADATA),
        metadataColumns: getMetadataColumns(state),
        numberOfFilesFound: getNumberOfFiles(state),
        optionsForLookup: getOptionsForLookup(state),
        optionsForLookupLoading: getRequestsInProgressContains(state, AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
        searchLoading: getRequestsInProgressContains(state, AsyncRequest.SEARCH_FILE_METADATA),
        searchResults: getFileMetadataSearchResults(state),
        searchResultsHeader: getSearchResultsHeader(state),
        templates: getTemplates(state),
        user: getUser(state),
        users: getUsers(state),
    };
}

const dispatchToPropsMap = {
    exportFileMetadataCSV,
    requestAnnotations,
    requestTemplates,
    retrieveOptionsForLookup,
    searchFileMetadata,
    selectAnnotation,
    selectUser,
    setAlert,
    updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SearchFiles);
