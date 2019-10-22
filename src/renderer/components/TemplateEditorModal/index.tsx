import { Button, Icon, Input, Modal, Select } from "antd";
import { ipcRenderer } from "electron";
import { isEmpty, uniqBy, without } from "lodash";
import * as React from "react";
import { ChangeEvent } from "react";
import ReactDataGrid from "react-data-grid";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_CREATE_SCHEMA_MODAL, SCHEMA_SYNONYM } from "../../../shared/constants";

import { requestAnnotations } from "../../state/metadata/actions";
import { getAnnotations, getAnnotationTypes, getDatabaseMetadata } from "../../state/metadata/selectors";
import { DatabaseMetadata, GetAnnotationsAction } from "../../state/metadata/types";
import { closeSchemaCreator, openSchemaCreator } from "../../state/selection/actions";
import { getShowCreateSchemaModal } from "../../state/selection/selectors";
import { CloseTemplateEditorAction, OpenTemplateEditorAction } from "../../state/selection/types";
import { addTemplateIdToSettings } from "../../state/setting/actions";
import { AddTemplateIdToSettingsAction } from "../../state/setting/types";
import { saveTemplate, updateTemplateDraft } from "../../state/template/actions";
import { getTemplateDraft } from "../../state/template/selectors";
import {
    Annotation,
    AnnotationDraft,
    AnnotationType, ColumnType, SaveTemplateAction,
    TemplateDraft,
    UpdateTemplateDraftAction,
} from "../../state/template/types";
import { State } from "../../state/types";

import BooleanEditor from "../BooleanHandler/BooleanEditor";
import BooleanFormatter from "../BooleanHandler/BooleanFormatter";
import FormControl from "../FormControl";
import LabeledInput from "../LabeledInput";

import ColumnTypeEditor from "./ColumnTypeEditor";
import ColumnTypeFormatter from "./ColumnTypeFormatter";

const styles = require("./styles.pcss");

interface ColumnTypeColumn extends AdazzleReactDataGrid.Column<AnnotationDraft> {
    tables?: DatabaseMetadata;
}

interface Props {
    addTemplateIdToSettings: ActionCreator<AddTemplateIdToSettingsAction>;
    allAnnotations: Annotation[];
    annotationTypes: AnnotationType[];
    className?: string;
    closeModal: ActionCreator<CloseTemplateEditorAction>;
    getAnnotations: ActionCreator<GetAnnotationsAction>;
    openModal: ActionCreator<OpenTemplateEditorAction>;
    saveTemplate: ActionCreator<SaveTemplateAction>;
    tables?: DatabaseMetadata; // todo
    template: TemplateDraft;
    updateTemplateDraft: ActionCreator<UpdateTemplateDraftAction>;
    visible: boolean;
}

interface TemplateEditorModalState {
    annotationNameSearchStr?: string;
    selectedRows: number[];
}

class TemplateEditorModal extends React.Component<Props, TemplateEditorModalState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedRows: [],
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
            this.setState({annotationNameSearchStr: "", selectedRows: []});
        }
    }

    public render() {
        const {
            allAnnotations,
            className,
            closeModal,
            template,
            visible,
        } = this.props;
        const { annotationNameSearchStr, selectedRows } = this.state;

        return (
            <Modal
                width="90%"
                className={className}
                title={template && template.templateId ? `Edit ${SCHEMA_SYNONYM}` : `New ${SCHEMA_SYNONYM}`}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={closeModal}
                okText="Save"
                okButtonProps={{disabled: !this.canSave()}}
                maskClosable={false}
            >
                <LabeledInput label="Column Template Name">
                    <Input value={template ? template.name : undefined} onChange={this.updateTemplateName}/>
                </LabeledInput>
                <LabeledInput label="Search for an Annotation Name">
                    <Select
                        allowClear={true}
                        autoClearSearchValue={true}
                        autoFocus={true}
                        className={styles.search}
                        defaultActiveFirstOption={false}
                        notFoundContent={null}
                        onChange={this.onColumnNameChange}
                        onSelect={this.addExistingAnnotation}
                        placeholder="Annotation Name"
                        showSearch={true}
                        showArrow={false}
                        suffixIcon={<Icon type="search"/>}
                        value={annotationNameSearchStr}
                    >
                        {allAnnotations.map((option: Annotation) => (
                            <Select.Option key={option.name}>{option.name}</Select.Option>
                        ))}
                    </Select>
                </LabeledInput>
                <div className={styles.buttons}>
                    <Button icon="plus" onClick={this.addAnnotation} disabled={isEmpty(annotationNameSearchStr)}/>
                    <Button icon="minus" onClick={this.removeAnnotations} disabled={isEmpty(selectedRows)}/>
                </div>
                <div className={styles.columnDefinitionForm}>
                    <div className={styles.grid}>
                        <ReactDataGrid
                            columns={this.schemaEditorColumns()}
                            rowGetter={this.getRow}
                            rowsCount={template.annotations.length}
                            cellNavigationMode="changeRow"
                            enableCellSelect={true}
                            onGridRowsUpdated={this.updateGridRow}
                            rowSelection={{
                                enableShiftSelect: true,
                                onRowsDeselected: this.deselectRows,
                                onRowsSelected: this.selectRows,
                                selectBy: {
                                    indexes: selectedRows,
                                },
                            }}
                        />
                    </div>
                </div>
            </Modal>
        );
    }

    private updateTemplateName = (e: ChangeEvent<HTMLInputElement>): void => {
        this.props.updateTemplateDraft({
            name: e.target.value,
        });
    }

    // `tables` isn't guaranteed to have loaded by the time this is clicked, need to allow this to update with the props
    private schemaEditorColumns = (): ColumnTypeColumn[] => ([
        {
            editable: true,
            formatter: ({value}: {value: string}) => {
                let error;
                if (!value) {
                    error = "This field is required";
                } else if (this.props.template.annotations.filter((c) => c.name === value).length > 1) {
                    error = "Column names must be unique";
                }
                return (
                    <FormControl
                        error={error}
                    >
                        {value}
                    </FormControl>
                );
            },
            key: "name",
            name: "Column Name",
            resizable: true,
            tables: this.props.tables,
            width: 300,
        },
        {
            editable: true,
            editor: ColumnTypeEditor,
            formatter: ColumnTypeFormatter,
            key: "type",
            name: "Data Type",
            tables: this.props.tables,
        },
        // todo add description
        {
            editable: true,
            editor: BooleanEditor,
            formatter: (props) => <BooleanFormatter {...props} rowKey="required" saveValue={this.saveValueByRow} />,
            key: "required",
            name: "Required?",
            tables: this.props.tables,
            width: 100,
        },
        // todo add allow multiple values
    ])

    // todo do this in logics?
    private saveValueByRow = (value: any, key: string, row: AnnotationDraft): void => {
        const annotations = [...this.props.template.annotations];
        annotations[row.index] = {
            ...annotations[row.index],
            [key]: value,
        };
        this.props.updateTemplateDraft({annotations});
    }

    private getRow = (i: number): AnnotationDraft => this.props.template.annotations[i];

    // todo: add this to a selector
    private canSave = (): boolean => {
        const { template: { annotations } } = this.props;
        const columnWithNoTypeFound: boolean = !!annotations.find(({type}) => !type || !type.annotationTypeId);
        const duplicateNamesFound: boolean = this.duplicateNamesFound();
        const columnWithNoLabelFound: boolean = !!annotations.find(({name}) => !name);
        const dropdownValuesMissing: boolean = !!annotations
            .find(({type}) => type.name === ColumnType.DROPDOWN && isEmpty(type.annotationOptions));
        const lookupValuesMissing: boolean = !!annotations
            .find(({type}) => type.name === ColumnType.LOOKUP && !type.lookupTable);

        return !duplicateNamesFound &&
               !columnWithNoLabelFound &&
               !dropdownValuesMissing &&
               !columnWithNoTypeFound &&
               !lookupValuesMissing;
    }

    // todo selector?
    private duplicateNamesFound = (): boolean => {
        let { template: { annotations } } = this.props;
        annotations = annotations.filter((c: AnnotationDraft) => !!c.name);
        return uniqBy(annotations, "name").length !== annotations.length;
    }

    private saveAndClose = () => {
        const { template } = this.props;
        const templateId = template ? template.templateId : undefined;
        this.props.saveTemplate(templateId);
    }

    // todo logics
    private updateGridRow = (e: AdazzleReactDataGrid.GridRowsUpdatedEvent<AnnotationDraft>) => {
        const { fromRow, toRow, updated } = e;
        const annotations = [...this.props.template.annotations];
        for (let i = fromRow; i <= toRow; i++) {
            annotations[i] = {
                ...annotations[i],
                ...updated,
            };
        }
        this.props.updateTemplateDraft({annotations});
    }

    // todo expose as props + logics
    private addAnnotation = () => {
        const { template: {annotations}} = this.props;
        const annotation = {
            ...this.DEFAULT_COLUMN,
            name: this.state.annotationNameSearchStr,
        };
        this.props.updateTemplateDraft({annotations: [...annotations, annotation]});
    }

    // todo expose as props + logics
    private removeAnnotations = () => {
        const { selectedRows } = this.state;
        const { template: {annotations}} = this.props;
        const annotations = [...annotations];
        selectedRows.forEach((row) => {
            annotations.splice(row, 1);
        });
        this.setState({ columns: annotations, selectedRows: [] });
    }

    private selectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        this.setState({selectedRows: [...this.state.selectedRows, ...indexes]});
    }

    private deselectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        const selectedRows = without(this.state.selectedRows, ...indexes);
        this.setState({selectedRows});
    }

    // todo expose as prop and add logics
    private onColumnNameChange = (columnName: string) => {
        // todo this is not correct
        this.props.updateTemplateDraft({columnName});
    }

    // todo expose as prop and add logics
    private addExistingAnnotation = (name: string) => {
        const { allAnnotations, template: { annotations } } = this.props;
        const annotation = allAnnotations.find((a: Annotation) => a.name === name);
        if (annotation) {
            this.props.updateTemplateDraft({
                annotations: [...annotations, annotation],
            });
        }
    }

    // todo
    private get DEFAULT_COLUMN(): AnnotationDraft {
        return {
            annotationType: this.props.annotationTypes.find((at: AnnotationType) => at.name === ColumnType.TEXT)
                || { annotationTypeId: 1, name: "Text"},
            canHaveMany: false,
            name: "",
            required: false,
        };
    }
}

function mapStateToProps(state: State) {
    return {
        allAnnotations: getAnnotations(state),
        annotationTypes: getAnnotationTypes(state),
        tables: getDatabaseMetadata(state),
        template: getTemplateDraft(state), // todo handle undefined
        visible: getShowCreateSchemaModal(state),
    };
}

const dispatchToPropsMap = {
    addTemplateIdToSettings,
    closeModal: closeSchemaCreator,
    getAnnotations: requestAnnotations,
    openModal: openSchemaCreator,
    saveTemplate,
    updateTemplateDraft,
};
export default connect(mapStateToProps, dispatchToPropsMap)(TemplateEditorModal);
