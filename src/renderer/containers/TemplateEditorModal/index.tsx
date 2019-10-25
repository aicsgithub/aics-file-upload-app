import { Alert, Icon, Input, List, Modal, Select, Tag } from "antd";
import { ipcRenderer } from "electron";
import * as React from "react";
import { ChangeEvent } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_CREATE_SCHEMA_MODAL, SCHEMA_SYNONYM } from "../../../shared/constants";

import { requestAnnotations } from "../../state/metadata/actions";
import { getAnnotations, getAnnotationTypes, getLookups } from "../../state/metadata/selectors";
import { GetAnnotationsAction } from "../../state/metadata/types";
import { closeSchemaCreator, openSchemaCreator } from "../../state/selection/actions";
import { getShowCreateSchemaModal } from "../../state/selection/selectors";
import { CloseTemplateEditorAction, OpenTemplateEditorAction } from "../../state/selection/types";
import { addTemplateIdToSettings } from "../../state/setting/actions";
import { AddTemplateIdToSettingsAction } from "../../state/setting/types";
import {
    addExistingAnnotation,
    removeAnnotations,
    saveTemplate,
    updateTemplateDraft
} from "../../state/template/actions";
import { getCanSaveTemplate, getTemplateDraft } from "../../state/template/selectors";
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

import LabeledInput from "../../components/LabeledInput/index";
import AnnotationForm from "./AnnotationForm";

const styles = require("./styles.pcss");
const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

interface Props {
    addAnnotation: ActionCreator<AddExistingAnnotationAction>;
    addTemplateIdToSettings: ActionCreator<AddTemplateIdToSettingsAction>;
    allAnnotations: Annotation[];
    annotationTypes: AnnotationType[];
    canSave: boolean;
    className?: string;
    closeModal: ActionCreator<CloseTemplateEditorAction>;
    getAnnotations: ActionCreator<GetAnnotationsAction>;
    openModal: ActionCreator<OpenTemplateEditorAction>;
    removeAnnotations: ActionCreator<RemoveAnnotationsAction>;
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
        ipcRenderer.on(OPEN_CREATE_SCHEMA_MODAL, (event: Event, templateId?: number) => {
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
            canSave: disabled,
            className,
            closeModal,
            template,
            visible,
        } = this.props;
        const { selectedAnnotation, showAlert } = this.state;

        return (
            <Modal
                width="90%"
                className={className}
                title={template && template.templateId ? `Edit ${SCHEMA_SYNONYM}` : `New ${SCHEMA_SYNONYM}`}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={closeModal}
                okText="Save"
                okButtonProps={{disabled}}
                maskClosable={false}
            >
                {showAlert && <Alert
                    afterClose={this.closeAlert}
                    className={styles.infoAlert}
                    closable={true}
                    showIcon={true}
                    type="info"
                    message={COLUMN_TEMPLATE_DESCRIPTION}
                />}
                <LabeledInput label="Column Template Name">
                    <Input value={template ? template.name : undefined} onChange={this.updateTemplateName}/>
                </LabeledInput>
                <div className={styles.listContainer}>
                    <List
                        className={styles.list}
                        dataSource={template.annotations}
                        header={<h4>Annotations</h4>}
                        itemLayout="vertical"
                        renderItem={this.renderListItem}
                    />
                    <div className={styles.formContainer}>
                        <LabeledInput label="Add Existing Annotation" className={styles.search}>
                            <Select
                                allowClear={true}
                                autoClearSearchValue={true}
                                autoFocus={true}
                                className={styles.search}
                                defaultActiveFirstOption={false}
                                notFoundContent={null}
                                onSelect={this.addExistingAnnotation}
                                placeholder="Annotation Name"
                                showSearch={true}
                                showArrow={false}
                                suffixIcon={<Icon type="search"/>}
                            >
                                {allAnnotations.map((option: Annotation) => (
                                    <Select.Option key={option.name}>{option.name}</Select.Option>
                                ))}
                            </Select>
                        </LabeledInput>
                        <div className={styles.or}>-&nbsp;Or&nbsp;-</div>
                        <AnnotationForm annotation={selectedAnnotation} className={styles.form}/>
                    </div>
                </div>
            </Modal>
        );
    }

    private closeAlert = () => this.setState({showAlert: false});

    private updateTemplateName = (e: ChangeEvent<HTMLInputElement>): void => {
        this.props.updateTemplateDraft({
            name: e.target.value,
        });
    }

    private renderListItem = (annotation: AnnotationDraft) => {
        const {canHaveMany, description, name, required, type} = annotation;
        const tags: Array<{color: string, text: string}> = [];
        if (required) {
            tags.push({color: "red", text: "required"});
        } else {
            tags.push({color: "red", text: "optional"});
        }

        if (canHaveMany) {
            tags.push({color: "blue", text: "multiple values allowed"});
        }

        const title = (
            <div>
                <h4 className={styles.annotationName}>{name}</h4>
                {tags.map(({color, text}) => (
                    <Tag color={color} key={text} className={styles.tag}>{text}</Tag>
                ))}
            </div>
        );

        return (
            <List.Item
                key={name}
                actions={[
                    <Icon type="delete" key="delete" onClick={this.removeAnnotation(annotation)}/>,
                    <Icon type="edit" key="edit" onClick={this.selectAnnotation(annotation)}/>,
                ]}
            >
                <List.Item.Meta
                    description={description}
                    title={title}
                />
            </List.Item>
        );
    }

    private saveValueByRow = (value: any, key: string, row: AnnotationDraft): void => {
        const annotations = [...this.props.template.annotations];
        annotations[row.index] = {
            ...annotations[row.index],
            [key]: value,
        };
        this.props.updateTemplateDraft({annotations});
    }

    private saveAndClose = () => {
        const { template } = this.props;
        const templateId = template ? template.templateId : undefined;
        this.props.saveTemplate(templateId);
    }

    private removeAnnotation = (annotation: AnnotationDraft) => () => {
        this.props.removeAnnotations(annotation.index);
    }

    private selectAnnotation = (annotation: AnnotationDraft) => () => {
        this.setState({selectedAnnotation: annotation});
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
}

function mapStateToProps(state: State) {
    return {
        allAnnotations: getAnnotations(state),
        annotationTypes: getAnnotationTypes(state),
        canSave: getCanSaveTemplate(state),
        tables: getLookups(state),
        template: getTemplateDraft(state),
        visible: getShowCreateSchemaModal(state),
    };
}

const dispatchToPropsMap = {
    addAnnotation: addExistingAnnotation,
    addTemplateIdToSettings,
    closeModal: closeSchemaCreator,
    getAnnotations: requestAnnotations,
    openModal: openSchemaCreator,
    removeAnnotations,
    saveTemplate,
    updateTemplateDraft,
};
export default connect(mapStateToProps, dispatchToPropsMap)(TemplateEditorModal);
