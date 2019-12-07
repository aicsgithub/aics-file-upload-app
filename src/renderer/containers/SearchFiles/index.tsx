import { Button, Checkbox, Col, Empty, Icon, Input, Radio, Row, Select, Table, } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import CheckboxGroup, { CheckboxValueType } from "antd/es/checkbox/Group";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import { remote, shell } from "electron";
import { difference, map, startCase } from "lodash";
import os from "os";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import FormPage from "../../components/FormPage";

import LabeledInput from "../../components/LabeledInput";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AlertType, AsyncRequest, SetAlertAction } from "../../state/feedback/types";
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
import { setMetadataColumns } from "../../state/setting/actions";
import { getMetadataColumns } from "../../state/setting/selectors";
import { SetMetadataColumnsAction } from "../../state/setting/types";
import { Annotation } from "../../state/template/types";
import { State } from "../../state/types";
import { LabkeyTemplate, LabkeyUser } from "../../util/labkey-client/types";
import FileMetadataModal from "./FileMetadataModal";

const styles = require("./styles.pcss");

enum SearchMode {
    Annotation = "Annotation",
    User = "User",
    Template = "Template",
    UserAndTemplate = "User & Template",
}

const searchModeOptions: SearchMode[] = map(SearchMode, (value) => value);
const EXTRA_COLUMN_OPTIONS = UNIMPORTANT_COLUMNS.map((value) => ({
    label: startCase(value),
    value
}));

interface Props {
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
    setMetadataColumns: ActionCreator<SetMetadataColumnsAction>;
    templates: LabkeyTemplate[];
    user: string;
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

const MAC = 'Darwin';
const WINDOWS = 'Windows_NT';

/*
    This container represents the Search Files tab, in this tab the user can query for files and their metadata
    by annotation name and value returning all files that have a matching name and value somewhere in their custom
    metadata.
 */
class SearchFiles extends React.Component<Props, SearchFilesState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showExtraColumnOptions: false,
            searchMode: SearchMode.Annotation
        };
    }

    public componentDidMount(): void {
        this.props.requestAnnotations();
        this.props.requestTemplates();
        this.props.retrieveOptionsForLookup(this.props.annotation);
    }

    public render() {
        const {
            className,
            numberOfFilesFound,
            exportingCSV,
            metadataColumns,
            searchLoading,
            searchResults,
            searchResultsHeader,
        } = this.props;
        const { selectedRow, searchMode, showExtraColumnOptions } = this.state;
        const allAreChecked = !difference(UNIMPORTANT_COLUMNS, metadataColumns).length;
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
                    <LabeledInput label="Search Mode">
                        <Radio.Group buttonStyle="solid" onChange={this.selectSearchMode} value={searchMode}>
                            {searchModeOptions.map((option) => (
                                <Radio.Button key={option} value={option}>{option}</Radio.Button>
                            ))}
                        </Radio.Group>
                    </LabeledInput>
                </Row>
                {searchMode === SearchMode.Annotation && this.renderAnnotationForm()}
                {searchMode === SearchMode.Template && this.renderTemplateForm()}
                {searchMode === SearchMode.User && this.renderUserForm()}
                {searchMode === SearchMode.UserAndTemplate && this.renderUserAndTemplateForm()}
                {searchLoading && <p>Searching...</p>}
                {exportingCSV && <p>Exporting...</p>}
                {numberOfFilesFound > 0 && (
                    <>
                        <Row>
                            <p className={styles.includeExtraColumns}>
                                Include Extra Columns{' '}
                                <Icon
                                    onClick={this.toggleShowExtraColumnOptions}
                                    type={showExtraColumnOptions ? "caret-down" : "caret-up"}
                                />
                            </p>
                            {showExtraColumnOptions && (
                                <>
                                    <Checkbox
                                        className={styles.checkAll}
                                        onChange={this.toggleCheckAll}
                                        indeterminate={!allAreChecked && !!metadataColumns.length}
                                        checked={allAreChecked}
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
                            title={() => `Search found ${numberOfFilesFound} files matching query`}
                            onRow={(record) => ({ onClick: () => this.toggleFileDetailModal(undefined, record) })}
                        />
                    </>
                )}
                {(searchResultsHeader && !numberOfFilesFound) && (
                    <Empty className={styles.empty} description="No Files found matching search" />
                )}
                <FileMetadataModal
                    fileMetadata={selectedRow}
                    onBrowse={this.onBrowseToFile}
                    toggleFileDetailModal={this.toggleFileDetailModal}
                />
            </FormPage>
        );
    }

    private onBrowseToFile = (filePath: string) => {
        let downloadPath;
        const userOS = os.type();
        if (userOS === WINDOWS) {
            downloadPath = filePath.replace(/\//g, '\\');
        } else if (userOS === MAC) {
            downloadPath = filePath;
        } else { // Linux
            downloadPath = filePath;
        }
        if (!shell.showItemInFolder(downloadPath)) {
            setAlert({
                message: "Failed to browse to file, contact software or browse to file path " +
                    "using files path(s) shown in metadata",
                type: AlertType.ERROR
            });
        }
    }

    private toggleShowExtraColumnOptions = () => {
        this.setState({ showExtraColumnOptions: !this.state.showExtraColumnOptions });
    }

    private toggleCheckAll = (e: CheckboxChangeEvent) => {
        this.setMetadataColumns(e.target.checked ? UNIMPORTANT_COLUMNS : []);
    }

    private setMetadataColumns = (metadataColumns: CheckboxValueType[]): void => {
        this.props.setMetadataColumns(metadataColumns);
    }

    private toggleFileDetailModal = (e?: any, selectedRow?: SearchResultRow): void => {
        this.setState({ selectedRow });
    }

    private renderAnnotationForm = (): JSX.Element => {
        const {
            annotation,
            annotations,
            exportingCSV,
            optionsForLookup,
            optionsForLookupLoading,
            searchLoading,
        } = this.props;
        const { searchValue } = this.state;
        return (
            <>
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
            </>
        );
    }

    private renderUserAndTemplateForm = (): JSX.Element => {
        const {
            exportingCSV,
            searchLoading,
            templates,
            user,
            users,
        } = this.props;
        const { template } = this.state;
        return (
            <>
                <Row>
                    <Button
                        disabled={searchLoading}
                        onClick={this.props.requestTemplates}
                        className={styles.refreshButton}
                    ><Icon type="sync" />Refresh Templates
                    </Button>
                </Row>
                <Row>
                    <Col xs={6}>
                        <LabeledInput label="User">
                            <Select
                                showSearch={true}
                                value={user}
                                loading={!users.length}
                                disabled={!users.length}
                                onChange={this.props.selectUser}
                                placeholder="Select User"
                                className={styles.fullWidth}
                            >
                                {users.map(({ DisplayName }) => (
                                    <Select.Option key={DisplayName} value={DisplayName}>{DisplayName}</Select.Option>
                                ))}
                            </Select>
                        </LabeledInput>
                    </Col>
                    <Col xs={12} xl={14} xxl={15}>
                        <LabeledInput label="Template">
                            <Select
                                allowClear={true}
                                showSearch={true}
                                value={template}
                                loading={!templates.length}
                                disabled={!templates.length}
                                onChange={this.selectTemplate}
                                placeholder="Select Template"
                                className={styles.fullWidth}
                            >
                                {templates.map(({ Name }) => (
                                    <Select.Option key={Name} value={Name}>{Name}</Select.Option>
                                ))}
                            </Select>
                        </LabeledInput>
                    </Col>
                    <Col xs={6} xl={4} xxl={3}>
                        <Button
                            loading={searchLoading}
                            disabled={!template || !user || searchLoading || exportingCSV}
                            size="large"
                            type="primary"
                            onClick={this.searchForFiles}
                            className={styles.searchButton}
                        ><Icon type="search" /> Search
                        </Button>
                    </Col>
                </Row>
            </>
        );
    }

    private renderUserForm = (): JSX.Element => {
        const {
            exportingCSV,
            searchLoading,
            user,
            users,
        } = this.props;
        return (
            <Row style={{ marginTop: '32px' }}>
                <Col xs={18} xl={20} xxl={21}>
                    <LabeledInput label="User">
                        <Select
                            showSearch={true}
                            value={user}
                            loading={!users.length}
                            disabled={!users.length}
                            onChange={this.props.selectUser}
                            placeholder="Select User"
                            className={styles.fullWidth}
                        >
                            {users.map(({ DisplayName }) => (
                                <Select.Option key={DisplayName} value={DisplayName}>{DisplayName}</Select.Option>
                            ))}
                        </Select>
                    </LabeledInput>
                </Col>
                <Col xs={6} xl={4} xxl={3}>
                    <Button
                        loading={searchLoading}
                        disabled={!user || searchLoading || exportingCSV}
                        size="large"
                        type="primary"
                        onClick={this.searchForFiles}
                        className={styles.searchButton}
                    ><Icon type="search" /> Search
                    </Button>
                </Col>
            </Row>
        )
    }

    private renderTemplateForm = (): JSX.Element => {
        const {
            exportingCSV,
            searchLoading,
            templates,
        } = this.props;
        const { template } = this.state;
        return (
            <>
                <Row>
                    <Button
                        disabled={searchLoading}
                        onClick={this.props.requestTemplates}
                        className={styles.refreshButton}
                    ><Icon type="sync" />Refresh Templates
                    </Button>
                </Row>
                <Row>
                    <Col xs={18} xl={20} xxl={21}>
                        <LabeledInput label="Template">
                            <Select
                                allowClear={true}
                                showSearch={true}
                                value={template}
                                loading={!templates.length}
                                disabled={!templates.length}
                                onChange={this.selectTemplate}
                                placeholder="Select Template"
                                className={styles.fullWidth}
                            >
                                {templates.map(({ Name }) => (
                                    <Select.Option key={Name} value={Name}>{Name}</Select.Option>
                                ))}
                            </Select>
                        </LabeledInput>
                    </Col>
                    <Col xs={6} xl={4} xxl={3}>
                        <Button
                            loading={searchLoading}
                            disabled={!template || searchLoading || exportingCSV}
                            size="large"
                            type="primary"
                            onClick={this.searchForFiles}
                            className={styles.searchButton}
                        ><Icon type="search" /> Search
                        </Button>
                    </Col>
                </Row>
            </>
        );
    }

    private selectTemplate = (template: string): void => {
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

    private selectSearchValue = (searchValue: string) => {
        this.setState({ searchValue });
    }

    private setSearchValue = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.selectSearchValue(e.target.value);
    }

    private searchForFiles = () => {
        const { annotation, user } = this.props;
        const { searchMode, searchValue, template } = this.state;
        switch (searchMode) {
            case SearchMode.Annotation:
                this.props.searchFileMetadata({ annotation, searchValue });
                return;
            case SearchMode.Template:
                this.props.searchFileMetadata({ template });
                return;
            case SearchMode.User:
                this.props.searchFileMetadata({ user });
                return;
            default: // case SearchMode.UserAndTemplate:
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
    setMetadataColumns,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SearchFiles);
