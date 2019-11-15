import { Alert, Input, List, Modal, Select, Spin } from "antd";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import { includes, trim } from "lodash";
import * as React from "react";
import { ChangeEvent, ReactNode, ReactNodeArray } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_TEMPLATE_EDITOR, SCHEMA_SYNONYM } from "../../../shared/constants";

import FormControl from "../../components/FormControl";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";
import { requestAnnotations } from "../../state/metadata/actions";
import {
    getAnnotationsWithAnnotationOptions,
    getAnnotationTypes,
    getLookups,
} from "../../state/metadata/selectors";
import { GetAnnotationsAction } from "../../state/metadata/types";
import { closeTemplateEditor, openTemplateEditor } from "../../state/selection/actions";
import { getTemplateEditorVisible } from "../../state/selection/selectors";
import { CloseTemplateEditorAction, OpenTemplateEditorAction } from "../../state/selection/types";
import { addTemplateIdToSettings } from "../../state/setting/actions";
import { AddTemplateIdToSettingsAction } from "../../state/setting/types";
import {
    addExistingAnnotation,
    removeAnnotations,
    saveTemplate,
    updateTemplateDraft
} from "../../state/template/actions";
import { getTemplateDraft, getTemplateDraftErrors } from "../../state/template/selectors";
import {
    AddExistingAnnotationAction,
    Annotation,
    AnnotationDraft,
    AnnotationType,
    AnnotationWithOptions,
    Lookup,
    RemoveAnnotationsAction,
    SaveTemplateAction,
    TemplateDraft,
    UpdateTemplateDraftAction,
} from "../../state/template/types";
import { State } from "../../state/types";

import AnnotationForm from "./AnnotationForm";
import AnnotationListItem from "./AnnotationListItem";

const styles = require("./styles.pcss");
const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

interface Props {
    addAnnotation: ActionCreator<AddExistingAnnotationAction>;
    addTemplateIdToSettings: ActionCreator<AddTemplateIdToSettingsAction>;
    allAnnotations: AnnotationWithOptions[];
    annotationTypes: AnnotationType[];
    className?: string;
    closeModal: ActionCreator<CloseTemplateEditorAction>;
    errors: string[];
    getAnnotations: ActionCreator<GetAnnotationsAction>;
    loadingTemplate: boolean;
    openModal: ActionCreator<OpenTemplateEditorAction>;
    removeAnnotations: ActionCreator<RemoveAnnotationsAction>;
    saveInProgress: boolean;
    saveTemplate: ActionCreator<SaveTemplateAction>;
    tables: Lookup[];
    template: TemplateDraft;
    updateTemplateDraft: ActionCreator<UpdateTemplateDraftAction>;
    visible: boolean;
}

interface TemplateEditorModalState {
    annotationNameSearch?: string;
    selectedAnnotation?: AnnotationDraft;
    showInfoAlert: boolean;
}

class TemplateEditorModal extends React.Component<Props, TemplateEditorModalState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showInfoAlert: true,
        };
    }

    public componentDidMount(): void {
        ipcRenderer.on(OPEN_TEMPLATE_EDITOR, this.openModal);

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
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_TEMPLATE_EDITOR, this.openModal);
    }

    public openModal = (event: Event, templateId?: number) => this.props.openModal(templateId);

    public render() {
        const {
            className,
            closeModal,
            errors,
            saveInProgress,
            template,
            visible,
        } = this.props;

        const isEditing = Boolean(template && template.templateId);
        const title = isEditing ? `Edit ${SCHEMA_SYNONYM}: ${template.name}` : `New ${SCHEMA_SYNONYM}`;
        return (
            <Modal
                width="90%"
                className={className}
                title={title}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={closeModal}
                okText="Save"
                okButtonProps={{disabled: errors.length > 0, loading: saveInProgress}}
                maskClosable={false}
            >
                {this.renderBody(isEditing)}
            </Modal>
        );
    }

    private closeAlert = () => this.setState({showInfoAlert: false});

    private updateTemplateName = (e: ChangeEvent<HTMLInputElement>): void => {
        this.props.updateTemplateDraft({
            name: e.target.value,
        });
    }

    private renderBody = (isEditing: boolean): ReactNode | ReactNodeArray => {
        const {
            allAnnotations,
            annotationTypes,
            errors,
            loadingTemplate,
            tables,
            template,
        } = this.props;
        const { annotationNameSearch, showInfoAlert } = this.state;
        const appliedAnnotationNames = template.annotations.map((a) => a.name)
            .concat("Workflow", "Well", "Notes");
        const filteredAnnotations = allAnnotations.filter((a) => !includes(appliedAnnotationNames, a.name));

        if (loadingTemplate) {
            return (
                <div className={styles.spinContainer}>
                    <div>Loading template...</div>
                    <Spin/>
                </div>
            );
        }

        return (
            <>
                {!isEditing && showInfoAlert && <Alert
                    afterClose={this.closeAlert}
                    className={styles.alert}
                    closable={true}
                    showIcon={true}
                    type="info"
                    message={COLUMN_TEMPLATE_DESCRIPTION}
                />}
                {!isEditing && <FormControl
                    className={styles.formControl}
                    label="Template Name"
                    error={!trim(template.name) ? "Template Name is required" : undefined}
                >
                    <Input
                        value={template.name}
                        onChange={this.updateTemplateName}
                    />
                </FormControl>}
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
                        <AnnotationForm
                            addAnnotation={this.addNewAnnotation}
                            annotationTypes={annotationTypes}
                            className={styles.form}
                            existingAnnotations={allAnnotations}
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
                {errors.length > 0 && (
                    <Alert
                        className={styles.errorAlert}
                        showIcon={true}
                        type="error"
                        message={errors.map((e) => <div key={e}>{e}</div>)}
                    />
                )}
            </>);
    }

    private renderListItem = (annotation: AnnotationDraft): ReactNode => {
        const { allAnnotations, annotationTypes, tables, template } = this.props;
        const { selectedAnnotation } = this.state;

        return (
            <AnnotationListItem
                addAnnotation={this.addNewAnnotation}
                allAnnotations={allAnnotations}
                annotation={annotation}
                annotationTypes={annotationTypes}
                cancelEditAnnotation={this.hideEditAnnotation}
                handleVisibleChange={this.handleVisibleChange(annotation)}
                isSelected={Boolean(selectedAnnotation && selectedAnnotation.name === annotation.name)}
                removeAnnotation={this.removeAnnotation(annotation)}
                tables={tables}
                template={template}
                updateAnnotation={this.updateAnnotation}
            />
        );
    }

    private onAnnotationNameSearchChange = (annotationNameSearch: string) => this.setState({annotationNameSearch});

    private handleVisibleChange = (annotation: AnnotationDraft) => (visible: boolean) => {
        this.setState({ selectedAnnotation: visible ? annotation : undefined });
    }

    private hideEditAnnotation = () => this.setState({selectedAnnotation: undefined});

    private updateAnnotation = (index: number, row: Partial<AnnotationDraft>): void => {
        const annotations = [...this.props.template.annotations];
        annotations[index] = {
            ...annotations[index],
            ...row,
        };
        this.props.updateTemplateDraft({annotations});
        this.setState({selectedAnnotation: undefined});
    }

    private saveAndClose = () => {
        const { template } = this.props;
        const templateId = template ? template.templateId : undefined;
        this.props.saveTemplate(templateId);
    }

    private removeAnnotation = (annotation: AnnotationDraft) => () => {
        this.props.removeAnnotations([annotation.index]);
    }

    private addExistingAnnotation = (existingAnnotationName: string) => {
        const { allAnnotations }  = this.props;
        const annotation = allAnnotations.find((a: Annotation) => a.name === existingAnnotationName);
        if (annotation) {
            const { annotationId, annotationOptions, annotationTypeId, description, name } = annotation;
            this.props.addAnnotation({
                annotationId,
                annotationOptions,
                annotationTypeId,
                description,
                name,
            });
            this.setState({annotationNameSearch: undefined});
        }
    }

    private addNewAnnotation = (draft: AnnotationDraft) => {
        const { annotations: oldAnnotations } = this.props.template;
        const annotations = [...oldAnnotations, draft];
        this.props.updateTemplateDraft({annotations});
    }
}

function mapStateToProps(state: State) {
    return {
        allAnnotations: getAnnotationsWithAnnotationOptions(state),
        annotationTypes: getAnnotationTypes(state),
        errors: getTemplateDraftErrors(state),
        loadingTemplate: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
        saveInProgress: getRequestsInProgressContains(state, AsyncRequest.SAVE_TEMPLATE),
        tables: getLookups(state),
        template: getTemplateDraft(state),
        visible: getTemplateEditorVisible(state),
    };
}

const dispatchToPropsMap = {
    addAnnotation: addExistingAnnotation,
    addTemplateIdToSettings,
    closeModal: closeTemplateEditor,
    getAnnotations: requestAnnotations,
    openModal: openTemplateEditor,
    removeAnnotations,
    saveTemplate,
    updateTemplateDraft,
};
export default connect(mapStateToProps, dispatchToPropsMap)(TemplateEditorModal);
