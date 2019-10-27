import { Button, Checkbox, Input, Select } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import TextArea from "antd/lib/input/TextArea";
import * as classNames from "classnames";
import { endsWith, isEmpty, startCase } from "lodash";
import { ChangeEvent } from "react";
import * as React from "react";

import FormControl from "../../../components/FormControl";
import { Annotation, AnnotationDraft, AnnotationType, ColumnType, Lookup } from "../../../state/template/types";

const styles = require("./styles.pcss");
const EMPTY_STATE: AnnotationFormState = {
    annotationOptions: undefined,
    canHaveManyValues: false,
    dataType: ColumnType.TEXT,
    description: undefined,
    lookupTableName: undefined,
    name: undefined,
    required: false,
};

interface Props {
    addAnnotation: (annotation: AnnotationDraft) => void;
    annotation?: AnnotationDraft;
    annotationTypes: AnnotationType[];
    cancel?: () => void;
    className?: string;
    existingAnnotations: Annotation[];
    index: number;
    lookups: Lookup[];
    templateAnnotations?: AnnotationDraft[];
    updateAnnotation: (index: number, annotation: Partial<AnnotationDraft>) => void;
}

interface AnnotationFormState {
    annotationOptions?: string[];
    canHaveManyValues: boolean;
    dataType: string;
    description?: string;
    lookupTableName?: string;
    name?: string;
    required: boolean;
}

class AnnotationForm extends React.Component<Props, AnnotationFormState> {
    public get annotationNameError(): string | undefined {
        const { existingAnnotations } = this.props;
        let { name } = this.state;
        if (!name) {
            return "Name is required";
        }

        name = startCase(name);

        const templateAnnotations = this.props.templateAnnotations || [];
        const allAnnotationsNames = [
            ...existingAnnotations.map((a) => startCase(a.name)),
            ...templateAnnotations.map((a) => startCase(a.name)),
            name,
        ];
        const annotationNameIsDuplicate = allAnnotationsNames.filter((a) => a === name).length > 1;
        if (annotationNameIsDuplicate) {
            return `Annotation named ${name} already exists`;
        }

        return undefined;
    }

    public get dropdownValuesError(): string | undefined {
        const { annotationOptions, dataType } = this.state;
        const isDropdown = dataType === ColumnType.DROPDOWN;

        return isDropdown && (!annotationOptions || isEmpty(annotationOptions)) ? "Dropdown values are required"
            : undefined;
    }

    public get lookupError(): string | undefined {
        const { dataType, lookupTableName } = this.state;
        const isLookup = dataType === ColumnType.LOOKUP;
        return isLookup && !lookupTableName ? "Lookup table must be specified" : undefined;
    }

    public get descriptionError(): string | undefined {
        return !this.state.description ? "Description is required" : undefined;
    }

    public get saveDisabled(): boolean {
        const {annotation} = this.props;
        const isReadOnly = Boolean(annotation && annotation.annotationId);
        return !isReadOnly &&
            !!(this.annotationNameError || this.dropdownValuesError || this.lookupError || this.descriptionError);
    }

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
            cancel,
            className,
        } = this.props;
        const {
            canHaveManyValues,
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
                        <FormControl label="Annotation Name" error={this.annotationNameError}>
                            <Input value={name} onChange={this.updateName}/>
                        </FormControl>
                        <FormControl label="Data Type">
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
                        </FormControl>
                        {this.renderAdditionalInputForType()}
                        <FormControl label="Description" error={this.descriptionError}>
                            <TextArea value={description} onChange={this.updateDescription}/>
                        </FormControl>
                    </>
                )}
                <Checkbox checked={required} onChange={this.setRequired}>Required</Checkbox>
                <Checkbox checked={canHaveManyValues} onChange={this.setCanHaveMany}>Allow Multiple Values</Checkbox>
                <div className={styles.buttonContainer}>
                    {cancel && (
                        <Button className={styles.button} onClick={cancel}>Cancel</Button>
                    )}
                    <Button
                        className={styles.button}
                        type="primary"
                        onClick={this.saveAnnotation}
                        disabled={this.saveDisabled}
                    >
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
                <FormControl label="Dropdown Values" error={this.dropdownValuesError}>
                    <Select
                        autoFocus={true}
                        className={styles.select}
                        disabled={isReadOnly}
                        mode="tags"
                        onChange={this.setDropdownValues}
                        placeholder="Dropdown Values"
                        value={this.state.annotationOptions}
                    />
                </FormControl>);
        }
        if (this.state.dataType === ColumnType.LOOKUP) {
            const { lookups } = this.props;
            return (
                <FormControl label="Lookup Table" error={this.lookupError}>
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
                </FormControl>
            );
        }
        return null;
    }

    private getStateFromProps = (props: Props) => {
        const { annotation } = props;
        if (!annotation) {
            return {...EMPTY_STATE};
        }
        return {
            annotationOptions: annotation.annotationOptions,
            canHaveManyValues: annotation.canHaveManyValues,
            dataType: annotation.annotationTypeName,
            description: annotation.description,
            name: annotation.name,
            required: annotation.required,
        };
    }

    private updateName = (e: ChangeEvent<HTMLInputElement>) => {
        const endsInSpace = endsWith(e.target.value, " ");
        const ending = endsInSpace ? " " : "";
        this.setState({name: startCase(e.target.value) + ending});
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
        this.setState({canHaveManyValues: e.target.checked});
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
            canHaveManyValues,
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
            annotationOptions,
            annotationTypeId: annotationTypeSelected.annotationTypeId,
            annotationTypeName: annotationTypeSelected.name,
            canHaveManyValues,
            description,
            index,
            lookupSchema: lookupSelected ? lookupSelected.schemaName : undefined,
            lookupTable: lookupSelected ? lookupSelected.tableName : undefined,
            name,
            required,
        };

        if (annotation) {
            this.props.updateAnnotation(index, draft);
        } else {
            this.props.addAnnotation(draft);
            this.setState({...EMPTY_STATE});
        }
    }
}

export default AnnotationForm;
