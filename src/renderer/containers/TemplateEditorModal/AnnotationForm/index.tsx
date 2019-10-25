import { Button, Checkbox, Input, Select } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import TextArea from "antd/lib/input/TextArea";
import * as classNames from "classnames";
import { ChangeEvent } from "react";
import * as React from "react";
import LabeledInput from "../../../components/LabeledInput";
import { AnnotationDraft, AnnotationType, ColumnType, Lookup } from "../../../state/template/types";

const styles = require("./styles.pcss");

interface Props {
    addAnnotation: (annotation: AnnotationDraft) => void;
    annotation?: AnnotationDraft;
    annotationTypes: AnnotationType[];
    className?: string;
    index: number;
    lookups: Lookup[];
    updateAnnotation: (index: number, annotation: Partial<AnnotationDraft>) => void;
}

interface AnnotationFormState {
    annotationOptions?: string[];
    canHaveMany: boolean;
    dataType: string;
    description?: string;
    lookupTableName?: string;
    name?: string;
    required: boolean;
}

class AnnotationForm extends React.Component<Props, AnnotationFormState> {

    constructor(props: Props) {
        super(props);
        this.state = this.getStateFromProps(props);
    }

    public componentDidUpdate(prevProps: Readonly<Props>): void {
        if (prevProps.annotation !== this.props.annotation) {
            this.setState(this.getStateFromProps(this.props));
        }
    }

    public render() {
        const {
            annotation,
            annotationTypes,
            className,
        } = this.props;
        const {
            canHaveMany,
            dataType,
            description,
            name,
            required,
        } = this.state;
        const isReadOnly = Boolean(annotation && annotation.annotationId);
        const isEditing = !!annotation;

        return (
            <form
                className={classNames(styles.container, className)}
            >
                <h4>{isEditing ? "Edit Annotation" : "Create New Annotation"}</h4>
                {!isReadOnly && (
                    <>
                        <LabeledInput label="Annotation Name">
                            <Input value={name} onChange={this.updateName}/>
                        </LabeledInput>
                        <LabeledInput label="Data Type">
                            <Select
                                autoFocus={true}
                                className={styles.select}
                                onChange={this.setColumnType}
                                placeholder="Column Type"
                                value={dataType}
                            >
                                {annotationTypes.map((at: AnnotationType) => (
                                    <Select.Option key={at.name} value={at.name}>
                                        {at.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </LabeledInput>
                        {this.renderAdditionalInputForType()}
                        <LabeledInput label="Description">
                            <TextArea value={description} onChange={this.updateDescription}/>
                        </LabeledInput>
                    </>
                )}
                <Checkbox value={required} onChange={this.setRequired}>Required</Checkbox>
                <Checkbox value={canHaveMany} onChange={this.setCanHaveMany}>Allow Multiple Values</Checkbox>
                <div className={styles.buttonContainer}>
                    <Button className={styles.button} type="primary" onClick={this.saveAnnotation}>
                        {isEditing ? "Update" : "Add"}
                    </Button>
                </div>
            </form>
        );
    }

    public renderAdditionalInputForType = (): React.ReactNode => {
        const isReadOnly = Boolean(this.props.annotation && this.props.annotation.annotationId);
        if (this.state.dataType === ColumnType.DROPDOWN) {
            return (
                <>
                    <Select
                        autoFocus={true}
                        className={styles.select}
                        disabled={isReadOnly}
                        mode="tags"
                        onChange={this.setDropdownValues}
                        placeholder="Dropdown values"
                        value={this.state.annotationOptions}
                    />
                </>);
        }
        if (this.state.dataType === ColumnType.LOOKUP) {
            const { lookups } = this.props;
            return (
                <>
                    <Select
                        autoFocus={!this.state.lookupTableName}
                        className={styles.select}
                        disabled={isReadOnly}
                        onChange={this.setLookup}
                        placeholder="Tables"
                        showSearch={true}
                        value={this.state.lookupTableName}
                    >
                        {lookups && lookups.map((l: Lookup) => l.tableName).sort().map((table: string) => (
                            <Select.Option key={table} value={table}>{table}</Select.Option>
                        ))}
                    </Select>
                </>
            );
        }
        return null;
    }

    private getStateFromProps = (props: Props) => {
        const { annotation } = props;
        return {
            annotationOptions: annotation ? annotation.type.annotationOptions : undefined,
            canHaveMany: annotation ? annotation.canHaveMany : false,
            dataType: annotation ? annotation.type.name : ColumnType.TEXT,
            description: annotation ? annotation.description : undefined,
            name: annotation ? annotation.name : undefined,
            required: annotation ? annotation.required : false,
        };
    }

    private updateName = (e: ChangeEvent<HTMLInputElement>) => {
        this.setState({name: e.target.value});
    }

    private updateDescription = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({description: e.target.value});
    }

    private setDropdownValues = (selectOption: string[]) => {
        this.setState({annotationOptions: selectOption});
    }

    private setLookup = (value: string) => {
        this.setState({ lookupTableName: value });
    }

    private setRequired = (e: CheckboxChangeEvent) => {
        this.setState({required: e.target.checked});
    }

    private setCanHaveMany = (e: CheckboxChangeEvent) => {
        this.setState({canHaveMany: e.target.checked});
    }

    private setColumnType = (dataType: string) => {
        const columnTypeIsDropdown = dataType === ColumnType.DROPDOWN;
        this.setState({
            annotationOptions: columnTypeIsDropdown ? [] : undefined,
            dataType,
            lookupTableName: undefined,
        });
    }

    private saveAnnotation = () => {
        const { annotation, annotationTypes, index, lookups } = this.props;
        const {
            annotationOptions,
            canHaveMany,
            dataType,
            description,
            lookupTableName,
            name,
            required,
        } = this.state;

        const annotationTypeSelected = annotationTypes.find((at) => at.name === dataType);
        const lookupSelected = lookupTableName ? lookups.find((l) => l.tableName === lookupTableName)
            : undefined;

        if (!annotationTypeSelected) {
            throw new Error(); // todo
        }

        const draft: AnnotationDraft = {
            canHaveMany,
            description,
            index,
            name,
            required,
            type: {
                annotationOptions,
                annotationTypeId: annotationTypeSelected.annotationTypeId,
                lookupColumn: lookupSelected ? lookupSelected.columnName : undefined,
                lookupSchema: lookupSelected ? lookupSelected.schemaName : undefined,
                lookupTable: lookupSelected ? lookupSelected.tableName : undefined,
                name: annotationTypeSelected.name,
            },
        };

        if (annotation) {
            this.props.updateAnnotation(index, draft);
        } else {
            this.props.addAnnotation(draft);
        }
    }
}

export default AnnotationForm;
