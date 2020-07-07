import { Button, Checkbox, Empty, Icon, Radio, Row, Table } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import CheckboxGroup, { CheckboxValueType } from "antd/es/checkbox/Group";
import { RadioChangeEvent } from "antd/es/radio";
import { ColumnProps } from "antd/lib/table";
import { remote } from "electron";
import { map, startCase } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FileMetadataModal from "../../components/FileMetadataModal";
import LabeledInput from "../../components/LabeledInput";
import { setAlert } from "../../state/feedback/actions";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { SetAlertAction } from "../../state/feedback/types";
import {
  exportFileMetadataCSV,
  requestAnnotations,
  requestTemplates,
  searchFileMetadata,
} from "../../state/metadata/actions";
import { UNIMPORTANT_COLUMNS } from "../../state/metadata/constants";
import {
  getAnnotations,
  getFileMetadataSearchResults,
  getNumberOfFiles,
  getSearchResultsHeader,
  getUsers,
} from "../../state/metadata/selectors";
import {
  ExportFileMetadataAction,
  GetAnnotationsAction,
  GetTemplatesAction,
  SearchFileMetadataAction,
  SearchResultRow,
} from "../../state/metadata/types";
import { selectAnnotation, selectUser } from "../../state/selection/actions";
import {
  getAnnotationIsLookup,
  getSelectedAnnotation,
  getSelectedUser,
} from "../../state/selection/selectors";
import {
  SelectAnnotationAction,
  SelectUserAction,
} from "../../state/selection/types";
import { updateSettings } from "../../state/setting/actions";
import {
  getAreAllMetadataColumnsSelected,
  getMetadataColumns,
} from "../../state/setting/selectors";
import { UpdateSettingsAction } from "../../state/setting/types";
import { Annotation } from "../../state/template/types";
import { AsyncRequest, State } from "../../state/types";
import { LabkeyUser } from "../../util/labkey-client/types";

import AnnotationForm from "./AnnotationForm";
import TemplateForm from "./TemplateForm";
import UserAndTemplateForm from "./UserAndTemplateForm";
import UserForm from "./UserForm";

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
  annotationIsLookup: boolean;
  annotations: Annotation[];
  className?: string;
  numberOfFilesFound: number;
  exportFileMetadataCSV: ActionCreator<ExportFileMetadataAction>;
  exportingCSV: boolean;
  metadataColumns: string[];
  requestAnnotations: ActionCreator<GetAnnotationsAction>;
  requestTemplates: ActionCreator<GetTemplatesAction>;
  searchFileMetadata: ActionCreator<SearchFileMetadataAction>;
  searchLoading: boolean;
  searchResults?: SearchResultRow[];
  searchResultsHeader?: Array<ColumnProps<SearchResultRow>>;
  selectAnnotation: ActionCreator<SelectAnnotationAction>;
  selectUser: ActionCreator<SelectUserAction>;
  setAlert: ActionCreator<SetAlertAction>;
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
  templateId?: number;
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
    const tableTitle = () =>
      `Search found ${numberOfFilesFound} files matching query`;
    return (
      <div className={className}>
        <h2>Search Files</h2>
        <div className={styles.searchControls}>
          <LabeledInput label="Search Mode" className={styles.searchMode}>
            <Radio.Group onChange={this.selectSearchMode} value={searchMode}>
              {searchModeOptions.map((option) => (
                <Radio.Button key={option} value={option}>
                  {option}
                </Radio.Button>
              ))}
            </Radio.Group>
          </LabeledInput>
          <div className={styles.buttons}>
            <Button
              className={styles.exportBtn}
              disabled={!numberOfFilesFound || exportingCSV}
              onClick={this.exportCSV}
            >
              Export CSV
            </Button>
            {searchMode === SearchMode.ANNOTATION && (
              <Button
                disabled={searchLoading}
                onClick={requestAnnotations}
                className={styles.refreshButton}
              >
                <Icon type="sync" />
                Refresh Annotations
              </Button>
            )}
            {(searchMode === SearchMode.TEMPLATE ||
              searchMode === SearchMode.USER_AND_TEMPLATE) && (
              <Button
                disabled={searchLoading}
                onClick={this.props.requestTemplates}
                className={styles.refreshButton}
              >
                <Icon type="sync" />
                Refresh Templates
              </Button>
            )}
          </div>
        </div>
        <Row gutter={8} className={styles.fullWidth}>
          {this.renderSearchForm()}
        </Row>
        {searchLoading && <p>Searching...</p>}
        {exportingCSV && <p>Exporting...</p>}
        {numberOfFilesFound > 0 && (
          <>
            <Row>
              <p
                className={styles.includeExtraColumns}
                onClick={this.toggleShowExtraColumnOptions}
              >
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
                    indeterminate={
                      !allMetadataColumnsSelected && !!metadataColumns.length
                    }
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
        {searchResultsHeader && !numberOfFilesFound && (
          <Empty
            className={styles.empty}
            description="No files found matching your search criteria"
          />
        )}
        <FileMetadataModal
          fileMetadata={selectedRow}
          closeFileDetailModal={this.toggleFileDetailModal}
        />
      </div>
    );
  }

  private renderSearchForm = (): JSX.Element => {
    const {
      annotation,
      annotationIsLookup,
      annotations,
      exportingCSV,
      searchLoading,
      user,
      users,
    } = this.props;
    const { searchMode, searchValue, templateId } = this.state;
    if (searchMode === SearchMode.ANNOTATION) {
      return (
        <AnnotationForm
          annotation={annotation}
          annotationIsLookup={annotationIsLookup}
          annotations={annotations}
          exportingCSV={exportingCSV}
          onSearch={this.searchForFiles}
          searchLoading={searchLoading}
          searchValue={searchValue}
          selectAnnotation={this.selectAnnotation}
          selectSearchValue={this.selectSearchValue}
          setSearchValue={this.selectSearchValue}
        />
      );
    }
    if (searchMode === SearchMode.TEMPLATE) {
      return (
        <TemplateForm
          exportingCSV={exportingCSV}
          searchLoading={searchLoading}
          onSearch={this.searchForFiles}
          templateId={templateId}
          selectTemplate={this.selectTemplate}
        />
      );
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
        />
      );
    }
    // searchMode === SearchMode.USER_AND_TEMPLATE
    return (
      <UserAndTemplateForm
        exportingCSV={exportingCSV}
        searchLoading={searchLoading}
        onSearch={this.searchForFiles}
        templateId={templateId}
        user={user}
        users={users}
        selectUser={this.props.selectUser}
        selectTemplate={this.selectTemplate}
      />
    );
  };

  private onRow = (row: SearchResultRow) => ({
    onClick: () => this.toggleFileDetailModal(undefined, row),
  });

  private toggleShowExtraColumnOptions = () => {
    this.setState({
      showExtraColumnOptions: !this.state.showExtraColumnOptions,
    });
  };

  private setMetadataColumns = (metadataColumns: CheckboxValueType[]) => {
    this.props.updateSettings({ metadataColumns });
  };

  private toggleCheckAll = (e: CheckboxChangeEvent) => {
    this.props.updateSettings({
      metadataColumns: e.target.checked ? UNIMPORTANT_COLUMNS : [],
    });
  };

  private toggleFileDetailModal = (
    e?: any,
    selectedRow?: SearchResultRow
  ): void => {
    this.setState({ selectedRow });
  };

  private selectTemplate = (templateId?: number): void => {
    this.setState({ templateId });
  };

  private selectSearchMode = (event: RadioChangeEvent): void => {
    this.setState({ searchMode: event.target.value as SearchMode });
  };

  private selectAnnotation = (annotation: string) => {
    this.props.selectAnnotation(annotation);
    this.setState({ searchValue: undefined });
  };

  private selectSearchValue = (searchValue?: string) => {
    this.setState({ searchValue });
  };

  private searchForFiles = () => {
    const { annotation, user } = this.props;
    const { searchMode, searchValue, templateId } = this.state;
    switch (searchMode) {
      case SearchMode.ANNOTATION:
        this.props.searchFileMetadata({ annotation, searchValue });
        return;
      case SearchMode.TEMPLATE:
        this.props.searchFileMetadata({ templateId });
        return;
      case SearchMode.USER:
        this.props.searchFileMetadata({ user });
        return;
      default:
        // case SearchMode.USER_AND_TEMPLATE:
        this.props.searchFileMetadata({ templateId, user });
        return;
    }
  };

  private exportCSV = async () => {
    const { filePath } = await remote.dialog.showSaveDialog({
      buttonLabel: "Save",
      defaultPath: "FileMetadata.csv",
      filters: [{ name: "CSV files", extensions: ["csv"] }],
      title: "Save File Metadata as CSV",
    });
    if (filePath) {
      let actualFileName = filePath;
      if (actualFileName.length < 4 || !actualFileName.endsWith(".csv")) {
        actualFileName += ".csv";
      }
      this.props.exportFileMetadataCSV(actualFileName);
    }
  };
}

function mapStateToProps(state: State) {
  return {
    allMetadataColumnsSelected: getAreAllMetadataColumnsSelected(state),
    annotation: getSelectedAnnotation(state),
    annotationIsLookup: getAnnotationIsLookup(state),
    annotations: getAnnotations(state),
    exportingCSV: getRequestsInProgressContains(
      state,
      AsyncRequest.EXPORT_FILE_METADATA
    ),
    metadataColumns: getMetadataColumns(state),
    numberOfFilesFound: getNumberOfFiles(state),
    searchLoading: getRequestsInProgressContains(
      state,
      AsyncRequest.SEARCH_FILE_METADATA
    ),
    searchResults: getFileMetadataSearchResults(state),
    searchResultsHeader: getSearchResultsHeader(state),
    user: getSelectedUser(state),
    users: getUsers(state),
  };
}

const dispatchToPropsMap = {
  exportFileMetadataCSV,
  requestAnnotations,
  requestTemplates,
  searchFileMetadata,
  selectAnnotation,
  selectUser,
  setAlert,
  updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SearchFiles);
