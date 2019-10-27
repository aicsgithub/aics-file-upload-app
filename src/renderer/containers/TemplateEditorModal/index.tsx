import { Alert, Input, List, Modal, Popover, Select, Tag } from "antd";
import { ipcRenderer } from "electron";
import { endsWith, includes, startCase } from "lodash";
import * as React from "react";
import { ChangeEvent } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_TEMPLATE_EDITOR, SCHEMA_SYNONYM } from "../../../shared/constants";
import FormControl from "../../components/FormControl";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";

import { requestAnnotations } from "../../state/metadata/actions";
import { getAnnotations, getAnnotationTypes, getLookups } from "../../state/metadata/selectors";
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
    AnnotationType, Lookup,
    RemoveAnnotationsAction,
    SaveTemplateAction,
    TemplateDraft,
    UpdateTemplateDraftAction,
} from "../../state/template/types";
import { State } from "../../state/types";

import AnnotationForm from "./AnnotationForm";
import IconText from "./IconText";

const styles = require("./styles.pcss");
const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

interface Props {
    addAnnotation: ActionCreator<AddExistingAnnotationAction>;
    addTemplateIdToSettings: ActionCreator<AddTemplateIdToSettingsAction>;
    allAnnotations: Annotation[];
    annotationTypes: AnnotationType[];
    className?: string;
    closeModal: ActionCreator<CloseTemplateEditorAction>;
    errors: string[];
    getAnnotations: ActionCreator<GetAnnotationsAction>;
    openModal: ActionCreator<OpenTemplateEditorAction>;
    removeAnnotations: ActionCreator<RemoveAnnotationsAction>;
    saveInProgress: boolean;
    saveTemplate: ActionCreator<SaveTemplateAction>;
    tables: Lookup[]; // todo
    template: TemplateDraft;
    updateTemplateDraft: ActionCreator<UpdateTemplateDraftAction>;
    visible: boolean;
}

interface TemplateEditorModalState {
    selectedAnnotation?: AnnotationDraft;
    showAlert: boolean;
}

class TemplateEditorModal extends React.Component<Props, TemplateEditorModalState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            showAlert: true,
        };
    }

    public componentDidMount(): void {
        ipcRenderer.on(OPEN_TEMPLATE_EDITOR, (event: Event, templateId?: number) => {
            this.props.openModal(templateId);
        });

        // todo get more frequently?
        this.props.getAnnotations();
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.template !== this.props.template) {
            this.setState({selectedAnnotation: undefined});
        }
    }

    public render() {
        const {
            allAnnotations,
            annotationTypes,
            className,
            closeModal,
            errors,
            saveInProgress,
            tables,
            template,
            visible,
        } = this.props;
        const { showAlert } = this.state;
        const appliedAnnotationNames = template.annotations.map((a) => a.name);
        const filteredAnnotations = allAnnotations.filter((a) => !includes(appliedAnnotationNames, a.name));

        return (
            <Modal
                width="90%"
                className={className}
                title={template && template.templateId ? `Edit ${SCHEMA_SYNONYM}` : `New ${SCHEMA_SYNONYM}`}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={closeModal}
                okText="Save"
                okButtonProps={{disabled: errors.length > 0, loading: saveInProgress}}
                maskClosable={false}
            >
                {showAlert && <Alert
                    afterClose={this.closeAlert}
                    className={styles.alert}
                    closable={true}
                    showIcon={true}
                    type="info"
                    message={COLUMN_TEMPLATE_DESCRIPTION}
                />}
                <FormControl
                    label="Column Template Name"
                    error={!template.name ? "Template Name is required" : undefined}
                >
                    <Input
                        value={template.name}
                        onChange={this.updateTemplateName}
                    />
                </FormControl>
                <div className={styles.body}>
                    <div className={styles.formContainer}>
                        <FormControl label="Add Existing Annotation" className={styles.search}>
                            <Select
                                className={styles.search}
                                onSelect={this.addExistingAnnotation}
                                placeholder="Annotation Name"
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
            </Modal>
        );
    }

    private closeAlert = () => this.setState({showAlert: false});

    private updateTemplateName = (e: ChangeEvent<HTMLInputElement>): void => {
        const endsInSpace = endsWith(e.target.value, " ");
        const ending = endsInSpace ? " " : "";
        this.props.updateTemplateDraft({
            name: startCase(e.target.value) + ending,
        });
    }

    // todo new component
    private renderListItem = (annotation: AnnotationDraft) => {
        const { allAnnotations, annotationTypes, tables, template } = this.props;
        const { selectedAnnotation } = this.state;

        const {
            annotationId,
            annotationOptions,
            annotationTypeName,
            canHaveManyValues,
            description,
            lookupTable,
            name,
            required,
        } = annotation;
        const tags: Array<{color: string, text: string}> = [];
        tags.push({color: "green", text: annotationTypeName});
        tags.push({color: "red", text: required ? "Required" : "Optional"});
        tags.push({color: "purple", text: annotationId ? "Existing Annotation" : "New"});

        if (canHaveManyValues) {
            tags.push({color: "blue", text: "Multiple Values Allowed"});
        }

        let metadata;
        if (lookupTable) {
            metadata = `Lookup table: ${lookupTable}`;
        } else if (annotationOptions && annotationOptions.length) {
            metadata = `Dropdown values: ${annotationOptions.join(", ")}`;
        }

        const title = (
            <div>
                <h4 className={styles.annotationName}>{name}</h4>
                {tags.map(({color, text}) => (
                    <Tag color={color} key={text} className={styles.tag}>{text}</Tag>
                ))}
            </div>
        );

        const editButton = (
            <Popover
                content={(
                    <AnnotationForm
                        addAnnotation={this.addNewAnnotation}
                        annotation={annotation}
                        annotationTypes={annotationTypes}
                        cancel={this.hideEditAnnotation}
                        existingAnnotations={allAnnotations}
                        index={annotation.index}
                        lookups={tables}
                        templateAnnotations={template.annotations}
                        updateAnnotation={this.updateAnnotation}
                    />
                    )}
                trigger="click"
                visible={Boolean(selectedAnnotation && selectedAnnotation.name === annotation.name)}
                onVisibleChange={this.handleVisibleChange(annotation)}
            >
                <IconText icon="edit" key="edit" text="Edit"/>
            </Popover>
        );

        return (
            <List.Item
                key={name}
                actions={[
                    <IconText icon="delete" key="delete" onClick={this.removeAnnotation(annotation)} text="Remove"/>,
                    editButton,
                ]}
            >
                <List.Item.Meta
                    description={metadata}
                    title={title}
                />
                {description}
            </List.Item>
        );
    }

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
            const { annotationId, annotationTypeId, description, name } = annotation;
            this.props.addAnnotation({
                annotationId,
                annotationTypeId,
                description,
                name,
            });
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
        allAnnotations: getAnnotations(state),
        annotationTypes: getAnnotationTypes(state),
        errors: getTemplateDraftErrors(state),
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
