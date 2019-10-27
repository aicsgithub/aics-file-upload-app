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
    annotationTypeName: ColumnType.TEXT,
    canHaveManyValues: false,
    description: undefined,
    lookupTable: undefined,
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
    annotationTypeName: string;
    description?: string;
    lookupTable?: string;
    name?: string;
    required: boolean;
}

class AnnotationForm extends React.Component<Props, AnnotationFormState> {
    public get annotationNameError(): string | undefined {
        let { name } = this.state;
        if (!name) {
            return "Name is required";
        }

        name = startCase(name);
        const { annotation } = this.props;

        // check that annotation name is not already an existing annotation if it's new
        const existingAnnotationNames = this.props.existingAnnotations.map((a) => startCase(a.name));
        const annotationNameDuplicatesExisting = existingAnnotationNames.find((a) => a === name);
        if ((!annotation || !annotation.annotationId) && !!annotationNameDuplicatesExisting) {
            return `Annotation named ${name} duplicates an existing annotation`;
        }

        // check that the annotation name doesn't exist in template already
        const templateAnnotations = this.props.templateAnnotations || [];
        const templateAnnotationNames = templateAnnotations.map((a) => startCase(a.name));

        if (!annotation) {
            templateAnnotationNames.push(name);
        }

        const numberOfAnnotationsMatchingName = templateAnnotationNames.filter((a) => a === name).length;

        return numberOfAnnotationsMatchingName > 1 ? `Annotation named ${name} already exists` : undefined;
    }

    public get dropdownValuesError(): string | undefined {
        const { annotationOptions, annotationTypeName } = this.state;
        const isDropdown = annotationTypeName === ColumnType.DROPDOWN;

        return isDropdown && (!annotationOptions || isEmpty(annotationOptions)) ? "Dropdown values are required"
            : undefined;
    }

    public get lookupError(): string | undefined {
        const { annotationTypeName, lookupTable } = this.state;
        const isLookup = annotationTypeName === ColumnType.LOOKUP;
        return isLookup && !lookupTable ? "Lookup table must be specified" : undefined;
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
            annotationTypeName,
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
                                className={styles.select}
                                onChange={this.setColumnType}
                                placeholder="Column Type"
                                value={annotationTypeName}
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
        if (this.state.annotationTypeName === ColumnType.DROPDOWN) {
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
        if (this.state.annotationTypeName === ColumnType.LOOKUP) {
            const { lookups } = this.props;
            return (
                <FormControl label="Lookup Table" error={this.lookupError}>
                    <Select
                        autoFocus={!this.state.lookupTable}
                        className={styles.select}
                        disabled={isReadOnly}
                        onChange={this.setLookup}
                        placeholder="Tables"
                        showSearch={true}
                        value={this.state.lookupTable}
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
        const {
            annotationOptions,
            ...etc
        } = annotation;
        return {
            annotationOptions: annotationOptions ? [...annotationOptions] : undefined,
            ...etc,
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
        this.setState({ lookupTable: value });
    }

    private setRequired = (e: CheckboxChangeEvent) => {
        this.setState({required: e.target.checked});
    }

    private setCanHaveMany = (e: CheckboxChangeEvent) => {
        this.setState({canHaveManyValues: e.target.checked});
    }

    private setColumnType = (annotationTypeName: string) => {
        const columnTypeIsDropdown = annotationTypeName === ColumnType.DROPDOWN;
        this.setState({
            annotationOptions: columnTypeIsDropdown ? [] : undefined,
            annotationTypeName,
            lookupTable: undefined,
        });
    }

    private saveAnnotation = () => {
        const { annotation, annotationTypes, index, lookups } = this.props;
        const {
            annotationOptions,
            annotationTypeName,
            canHaveManyValues,
            description,
            lookupTable,
            name,
            required,
        } = this.state;
        const annotationTypeSelected = annotationTypes.find((at) => at.name === annotationTypeName);
        const lookupSelected = lookupTable ? lookups.find((l) => l.tableName === lookupTable)
            : undefined;

        if (!annotationTypeSelected) {
            throw new Error(); // todo
        }

        const draft: AnnotationDraft = {
            annotationOptions,
            annotationTypeId: annotationTypeSelected.annotationTypeId,
            annotationTypeName,
            canHaveManyValues,
            description,
            index,
            lookupSchema: lookupSelected ? lookupSelected.schemaName : undefined,
            lookupTable,
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
