import { Alert, Input, List, Modal, Select, Spin } from "antd";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import { includes, trim } from "lodash";
import * as React from "react";
import { ChangeEvent, ReactNode, ReactNodeArray } from "react";
import { connect, ConnectedProps } from "react-redux";

import {
  OPEN_TEMPLATE_MENU_ITEM_CLICKED,
  SCHEMA_SYNONYM,
} from "../../../shared/constants";
import FormControl from "../../components/FormControl";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { NOTES_ANNOTATION_NAME, WELL_ANNOTATION_NAME } from "../../constants";
import { Annotation } from "../../services/labkey-client/types";
import { closeModal } from "../../state/feedback/actions";
import {
  getRequestsInProgressContains,
  getTemplateEditorVisible,
} from "../../state/feedback/selectors";
import { requestAnnotations } from "../../state/metadata/actions";
import {
  getAnnotationsWithAnnotationOptions,
  getAnnotationTypes,
  getForbiddenAnnotationNames,
  getLookups,
} from "../../state/metadata/selectors";
import { openTemplateEditor } from "../../state/selection/actions";
import { updateSettings } from "../../state/setting/actions";
import { getShowTemplateHint } from "../../state/setting/selectors";
import {
  addExistingAnnotation,
  addExistingTemplate,
  removeAnnotations,
  saveTemplate,
  updateTemplateDraft,
} from "../../state/template/actions";
import {
  getTemplateDraft,
  getTemplateDraftErrors,
} from "../../state/template/selectors";
import { AnnotationDraft, AsyncRequest, State } from "../../state/types";

import AnnotationForm from "./AnnotationForm";
import AnnotationListItem from "./AnnotationListItem";

const styles = require("./styles.pcss");
const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

const mapStateToProps = (state: State) => ({
  allAnnotations: getAnnotationsWithAnnotationOptions(state),
  annotationTypes: getAnnotationTypes(state),
  errors: getTemplateDraftErrors(state),
  forbiddenAnnotationNames: getForbiddenAnnotationNames(state),
  loadingTemplate: getRequestsInProgressContains(
    state,
    AsyncRequest.GET_TEMPLATE
  ),
  saveInProgress: getRequestsInProgressContains(
    state,
    AsyncRequest.SAVE_TEMPLATE
  ),
  tables: getLookups(state),
  template: getTemplateDraft(state),
  visible: getTemplateEditorVisible(state),
  showTemplateHint: getShowTemplateHint(state),
});

const dispatchToPropsMap = {
  addAnnotation: addExistingAnnotation,
  addExistingTemplate,
  closeModal,
  getAnnotations: requestAnnotations,
  openModal: openTemplateEditor,
  removeAnnotations,
  saveTemplate,
  updateTemplateDraft,
  updateSettings,
};

const connector = connect(mapStateToProps, dispatchToPropsMap);

type Props = ConnectedProps<typeof connector> & {
  className?: string;
};

interface TemplateEditorModalState {
  templateNameChanged: boolean;
  annotationNameSearch?: string;
  selectedAnnotation?: AnnotationDraft;
  showErrorAlert: boolean;
  copiedTemplate?: number;
}

class TemplateEditorModal extends React.Component<
  Props,
  TemplateEditorModalState
> {
  constructor(props: Props) {
    super(props);
    this.state = {
      templateNameChanged: false,
      annotationNameSearch: undefined,
      selectedAnnotation: undefined,
      showErrorAlert: false,
      copiedTemplate: undefined,
    };
  }

  public componentDidMount(): void {
    ipcRenderer.on(OPEN_TEMPLATE_MENU_ITEM_CLICKED, this.openModal);

    this.props.getAnnotations();
  }

  public componentDidUpdate(prevProps: Props): void {
    if (prevProps.template !== this.props.template) {
      this.setState({
        annotationNameSearch: undefined,
        selectedAnnotation: undefined,
      });
      this.props.getAnnotations();
    }

    if (prevProps.errors.length > 0 && this.props.errors.length === 0) {
      this.setState({ showErrorAlert: false });
    }
  }

  public componentWillUnmount(): void {
    ipcRenderer.removeListener(OPEN_TEMPLATE_MENU_ITEM_CLICKED, this.openModal);
  }

  public render() {
    const { className, saveInProgress, template, visible } = this.props;

    const isEditing = Boolean(template && template.templateId);
    const title = isEditing
      ? `Edit ${SCHEMA_SYNONYM}: ${template.name}`
      : `New ${SCHEMA_SYNONYM}`;
    return (
      <Modal
        width="90%"
        className={className}
        title={title}
        visible={visible}
        onOk={this.handleSave}
        onCancel={this.closeModal}
        okText="Save"
        okButtonProps={{ loading: saveInProgress }}
        maskClosable={false}
        destroyOnClose={true} // Unmount child components
      >
        {this.renderBody(isEditing)}
      </Modal>
    );
  }

  private openModal = (event: Event, templateId?: number) =>
    this.props.openModal(templateId);
  private closeModal = () => {
    this.props.closeModal("templateEditor");
    this.setState({
      templateNameChanged: false,
      showErrorAlert: false,
    });
  };

  private handleSave = () => {
    if (this.props.errors.length === 0) {
      this.props.saveTemplate();
    } else if (!this.state.showErrorAlert) {
      this.setState({ showErrorAlert: true });
    }
  };

  private closeAlert = () =>
    this.props.updateSettings({ showTemplateHint: false });

  private updateTemplateName = (e: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ templateNameChanged: true });
    this.props.updateTemplateDraft({ name: e.target.value });
  };

  private renderBody = (isEditing: boolean): ReactNode | ReactNodeArray => {
    const {
      allAnnotations,
      annotationTypes,
      errors,
      forbiddenAnnotationNames,
      loadingTemplate,
      tables,
      template,
      showTemplateHint,
    } = this.props;
    const {
      templateNameChanged,
      annotationNameSearch,
      showErrorAlert,
    } = this.state;
    const appliedAnnotationNames = template.annotations
      .map((a) => a.name)
      .concat(WELL_ANNOTATION_NAME, NOTES_ANNOTATION_NAME);
    const filteredAnnotations = allAnnotations.filter(
      (a) => !includes(appliedAnnotationNames, a.name)
    );

    if (loadingTemplate) {
      return (
        <div className={styles.spinContainer}>
          <div>Loading template...</div>
          <Spin />
        </div>
      );
    }

    return (
      <>
        {!isEditing && showTemplateHint && (
          <Alert
            afterClose={this.closeAlert}
            className={styles.alert}
            closable={true}
            showIcon={true}
            type="info"
            message={COLUMN_TEMPLATE_DESCRIPTION}
          />
        )}
        {!isEditing && (
          <FormControl
            className={styles.formControl}
            label="Template Name"
            error={
              (templateNameChanged || showErrorAlert) && !trim(template.name)
                ? "Template Name is required"
                : undefined
            }
          >
            <Input value={template.name} onChange={this.updateTemplateName} />
          </FormControl>
        )}
        <div className={styles.body}>
          <div className={styles.formContainer}>
            <FormControl
              label="Add Existing Annotation"
              className={classNames(styles.search, styles.formControl)}
            >
              <Select
                className={styles.search}
                onSearch={this.onAnnotationNameSearchChange}
                onSelect={this.addExistingAnnotation}
                placeholder="Annotation Name"
                showSearch={true}
                value={annotationNameSearch}
              >
                {filteredAnnotations.map((option: Annotation) => (
                  <Select.Option key={option.name}>{option.name}</Select.Option>
                ))}
              </Select>
            </FormControl>
            <div className={styles.or}>-&nbsp;Or&nbsp;-</div>
            <LabeledInput
              className={styles.selector}
              label="Copy Existing Template"
            >
              <TemplateSearch
                allowCreate={false}
                value={this.state.copiedTemplate}
                onSelect={this.addExistingTemplate}
              />
            </LabeledInput>
            <div className={styles.or}>-&nbsp;Or&nbsp;-</div>
            <AnnotationForm
              addAnnotation={this.addNewAnnotation}
              annotationTypes={annotationTypes}
              className={styles.form}
              existingAnnotations={allAnnotations}
              forbiddenAnnotationNames={forbiddenAnnotationNames}
              index={template.annotations.length}
              lookups={tables}
              templateAnnotations={template.annotations}
              updateAnnotation={this.updateAnnotation}
            />
          </div>
          <div className={styles.listContainer}>
            <List
              className={styles.list}
              dataSource={template.annotations}
              header={<h4>Annotations</h4>}
              itemLayout="vertical"
              renderItem={this.renderListItem}
            />
          </div>
        </div>
        {this.state.showErrorAlert && (
          <Alert
            className={styles.errorAlert}
            showIcon={true}
            type="error"
            message={errors.map((e) => (
              <div key={e}>{e}</div>
            ))}
          />
        )}
      </>
    );
  };

  private renderListItem = (annotation: AnnotationDraft): ReactNode => {
    const {
      allAnnotations,
      annotationTypes,
      forbiddenAnnotationNames,
      tables,
      template,
    } = this.props;
    const { selectedAnnotation } = this.state;

    return (
      <AnnotationListItem
        addAnnotation={this.addNewAnnotation}
        allAnnotations={allAnnotations}
        annotation={annotation}
        annotationTypes={annotationTypes}
        cancelEditAnnotation={this.hideEditAnnotation}
        forbiddenAnnotationNames={forbiddenAnnotationNames}
        handleVisibleChange={this.handleVisibleChange(annotation)}
        isSelected={Boolean(
          selectedAnnotation && selectedAnnotation.name === annotation.name
        )}
        removeAnnotation={this.removeAnnotation(annotation)}
        tables={tables}
        template={template}
        updateAnnotation={this.updateAnnotation}
      />
    );
  };

  private onAnnotationNameSearchChange = (annotationNameSearch: string) =>
    this.setState({ annotationNameSearch });

  private handleVisibleChange = (annotation: AnnotationDraft) => (
    visible: boolean
  ) => {
    this.setState({ selectedAnnotation: visible ? annotation : undefined });
  };

  private hideEditAnnotation = () =>
    this.setState({ selectedAnnotation: undefined });

  private updateAnnotation = (
    index: number,
    row: Partial<AnnotationDraft>
  ): void => {
    const annotations = [...this.props.template.annotations];
    annotations[index] = {
      ...annotations[index],
      ...row,
    };
    this.props.updateTemplateDraft({ annotations });
    this.setState({ selectedAnnotation: undefined });
  };

  private removeAnnotation = (annotation: AnnotationDraft) => () => {
    this.props.removeAnnotations([annotation.index]);
  };

  private addExistingAnnotation = (existingAnnotationName: string) => {
    const { allAnnotations } = this.props;
    const annotation = allAnnotations.find(
      (a: Annotation) => a.name === existingAnnotationName
    );
    if (annotation) {
      this.props.addAnnotation(annotation);
      this.setState({ annotationNameSearch: undefined });
    }
  };

  private addNewAnnotation = (draft: AnnotationDraft) => {
    const { annotations: oldAnnotations } = this.props.template;
    const annotations = [...oldAnnotations, draft];
    this.props.updateTemplateDraft({ annotations });
  };

  private addExistingTemplate = (templateId: number) => {
    this.props.addExistingTemplate(templateId);
  };
}

export default connector(TemplateEditorModal);
