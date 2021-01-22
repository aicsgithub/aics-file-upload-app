import { Button, Checkbox, Input, Select } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import TextArea from "antd/lib/input/TextArea";
import * as classNames from "classnames";
import { endsWith, isEmpty, trim } from "lodash";
import { ChangeEvent } from "react";
import * as React from "react";

import FormControl from "../../../components/FormControl";
import {
  Annotation,
  AnnotationType,
  ColumnType,
  Lookup,
} from "../../../services/labkey-client/types";
import { AnnotationDraft } from "../../../state/types";
import { titleCase } from "../../../util";

import EditAnnotationForm from "./EditAnnotationForm";

const styles = require("./styles.pcss");
const EMPTY_STATE: AnnotationFormState = {
  annotationOptions: undefined,
  annotationTypeName: ColumnType.TEXT,
  description: undefined,
  lookupTable: undefined,
  name: undefined,
  required: false,
  nameChanged: false,
  descriptionChanged: false,
};

interface Props {
  addAnnotation: (annotation: AnnotationDraft) => void;
  annotation?: AnnotationDraft;
  annotationTypes: AnnotationType[];
  cancel?: () => void;
  className?: string;
  forbiddenAnnotationNames: Set<string>;
  existingAnnotations: Annotation[];
  index: number;
  lookups: Lookup[];
  templateAnnotations?: AnnotationDraft[];
  updateAnnotation: (
    index: number,
    annotation: Partial<AnnotationDraft>
  ) => void;
}

interface AnnotationFormState {
  annotationOptions?: string[];
  annotationTypeName: string;
  description?: string;
  lookupTable?: string;
  name?: string;
  required: boolean;
  nameChanged: boolean;
  descriptionChanged: boolean;
}

class AnnotationForm extends React.Component<Props, AnnotationFormState> {
  public get annotationNameError(): string | undefined {
    let { name } = this.state;
    if (!trim(name)) {
      return "Name is required";
    }

    name = titleCase(name);
    const { annotation, forbiddenAnnotationNames } = this.props;

    // check that annotation name is not already an existing annotation if it's new
    const existingAnnotationNames = this.props.existingAnnotations.map((a) =>
      titleCase(a.name)
    );
    const annotationNameDuplicatesExisting = existingAnnotationNames.find(
      (a) => a === name
    );
    if (
      (!annotation || !annotation.annotationId) &&
      !!annotationNameDuplicatesExisting
    ) {
      return `Annotation named ${name} duplicates an existing annotation`;
    }

    if (forbiddenAnnotationNames.has(name)) {
      return `Annotation name ${name} is reserved, contact Software to use it`;
    }

    // check that the annotation name doesn't exist in template already
    const templateAnnotations = this.props.templateAnnotations || [];
    const templateAnnotationNames = templateAnnotations.map((a) =>
      titleCase(a.name)
    );

    if (!annotation) {
      templateAnnotationNames.push(name);
    }

    const numberOfAnnotationsMatchingName = templateAnnotationNames.filter(
      (a) => a === name
    ).length;

    return numberOfAnnotationsMatchingName > 1
      ? `Annotation named ${name} already exists`
      : undefined;
  }

  public get dropdownValuesError(): string | undefined {
    const { annotationOptions, annotationTypeName } = this.state;
    const isDropdown = annotationTypeName === ColumnType.DROPDOWN;
    const nonEmptyAnnotationOptions = (annotationOptions || []).filter(
      (o) => !!trim(o)
    );
    if (isDropdown && isEmpty(nonEmptyAnnotationOptions)) {
      return "Dropdown values are required";
    } else if (isDropdown && nonEmptyAnnotationOptions.length === 1) {
      return "Dropdowns require at least two options.";
    }
    return undefined;
  }

  public get lookupError(): string | undefined {
    const { annotationTypeName, lookupTable } = this.state;
    const isLookup = annotationTypeName === ColumnType.LOOKUP;
    return isLookup && !lookupTable
      ? "Lookup table must be specified"
      : undefined;
  }

  public get descriptionError(): string | undefined {
    return !trim(this.state.description)
      ? "Description is required"
      : undefined;
  }

  public get isSaveDisabled(): boolean {
    const { annotation } = this.props;
    const isReadOnly = Boolean(annotation && annotation.annotationId);
    return (
      !isReadOnly &&
      !!(
        this.annotationNameError ||
        this.dropdownValuesError ||
        this.lookupError ||
        this.descriptionError
      )
    );
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
    if (this.props.annotation) {
      return (
        <EditAnnotationForm
          annotationOptions={this.state.annotationOptions}
          annotationTypeName={this.state.annotationTypeName}
          className={styles.container}
          dropdownValuesError={this.dropdownValuesError}
          existingAnnotationOptions={this.props.annotation.annotationOptions}
          isSaveDisabled={this.isSaveDisabled}
          onCancel={this.props.cancel}
          required={this.state.required}
          saveAnnotation={this.saveAnnotation}
          setDropdownValues={this.setDropdownValues}
          setRequired={this.setRequired}
        />
      );
    }

    return (
      <form className={classNames(styles.container, this.props.className)}>
        <h4>Create New Annotation</h4>
        <FormControl
          label="Annotation Name"
          error={this.state.nameChanged ? this.annotationNameError : undefined}
          className={styles.formControl}
        >
          <Input value={this.state.name} onChange={this.updateName} />
        </FormControl>
        <FormControl label="Data Type" className={styles.formControl}>
          <Select
            className={styles.select}
            onChange={this.setColumnType}
            placeholder="Column Type"
            value={this.state.annotationTypeName}
          >
            {this.props.annotationTypes.map((at: AnnotationType) => (
              <Select.Option key={at.name} value={at.name}>
                {at.name}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
        {this.renderAdditionalInputForAnnotationType()}
        <FormControl
          label="Description"
          error={
            this.state.descriptionChanged ? this.descriptionError : undefined
          }
          className={styles.formControl}
        >
          <TextArea
            value={this.state.description}
            onChange={this.updateDescription}
          />
        </FormControl>
        <Checkbox checked={this.state.required} onChange={this.setRequired}>
          Required
        </Checkbox>
        <div className={styles.buttonContainer}>
          {this.props.cancel && (
            <Button className={styles.button} onClick={this.props.cancel}>
              Cancel
            </Button>
          )}
          <Button
            className={styles.button}
            type="primary"
            onClick={this.saveAnnotation}
            disabled={this.isSaveDisabled}
          >
            Add
          </Button>
        </div>
      </form>
    );
  }

  private renderAdditionalInputForAnnotationType = () => {
    switch (this.state.annotationTypeName) {
      case ColumnType.DROPDOWN:
        return (
          <FormControl
            label="Dropdown Values"
            error={this.dropdownValuesError}
            className={styles.formControl}
          >
            <Select
              autoFocus={true}
              className={styles.select}
              mode="tags"
              onChange={this.setDropdownValues}
              placeholder="Dropdown Values"
              value={this.state.annotationOptions}
            />
          </FormControl>
        );
      case ColumnType.LOOKUP:
        return (
          <FormControl
            label="Lookup Table"
            error={this.lookupError}
            className={styles.formControl}
          >
            <Select
              autoFocus={!this.state.lookupTable}
              className={styles.select}
              onChange={this.setLookup}
              placeholder="Tables"
              showSearch={true}
              value={this.state.lookupTable}
            >
              {this.props.lookups &&
                this.props.lookups
                  .map((l: Lookup) => l.tableName)
                  .sort()
                  .map((table: string) => (
                    <Select.Option key={table} value={table}>
                      {table}
                    </Select.Option>
                  ))}
            </Select>
          </FormControl>
        );
      default:
        return null;
    }
  };

  private getStateFromProps = (props: Props) => {
    const { annotation } = props;
    if (!annotation) {
      return { ...EMPTY_STATE };
    }
    const { annotationOptions, ...etc } = annotation;
    return {
      annotationOptions: annotationOptions ? [...annotationOptions] : undefined,
      ...etc,
      nameChanged: false,
      descriptionChanged: false,
    };
  };

  private updateName = (e: ChangeEvent<HTMLInputElement>) => {
    const endsInSpace = endsWith(e.target.value, " ");
    const ending = endsInSpace ? " " : "";
    this.setState({
      name: titleCase(e.target.value) + ending,
      nameChanged: true,
    });
  };

  private updateDescription = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ description: e.target.value, descriptionChanged: true });
  };

  private setDropdownValues = (values: string[]) => {
    this.setState({ annotationOptions: values.filter((v) => !!trim(v)) });
  };

  private setLookup = (value: string) => {
    this.setState({ lookupTable: value });
  };

  private setRequired = (e: CheckboxChangeEvent) => {
    this.setState({ required: e.target.checked });
  };

  private setColumnType = (annotationTypeName: string) => {
    const columnTypeIsDropdown = annotationTypeName === ColumnType.DROPDOWN;
    this.setState({
      annotationOptions: columnTypeIsDropdown ? [] : undefined,
      annotationTypeName,
      lookupTable: undefined,
    });
  };

  private saveAnnotation = () => {
    const { annotation, annotationTypes, index, lookups } = this.props;
    const {
      annotationOptions,
      annotationTypeName,
      description,
      lookupTable,
      name,
      required,
    } = this.state;
    const annotationTypeSelected = annotationTypes.find(
      (at) => at.name === annotationTypeName
    );
    const lookupSelected = lookupTable
      ? lookups.find((l) => l.tableName === lookupTable)
      : undefined;

    if (!annotationTypeSelected) {
      throw new Error(
        "Could not find an annotation type matching the selected annotationTypeName. Contact Software."
      );
    }

    const draft: AnnotationDraft = {
      annotationOptions,
      annotationTypeId: annotationTypeSelected.annotationTypeId,
      annotationTypeName,
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
      this.setState({ ...EMPTY_STATE });
    }
  };
}

export default AnnotationForm;
