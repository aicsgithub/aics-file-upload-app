import { Button, Checkbox, Select } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import classNames from "classnames";
import * as React from "react";

import FormControl from "../../../components/FormControl";
import { ColumnType } from "../../../services/labkey-client/types";

const styles = require("./styles.pcss");

interface Props {
  annotationOptions?: string[];
  annotationTypeName: string;
  className?: string;
  dropdownValuesError?: string;
  existingAnnotationOptions?: string[];
  onCancel?: () => void;
  required: boolean;
  saveAnnotation: () => void;
  isSaveDisabled: boolean;
  setDropdownValues: (dropdownValues: string[]) => void;
  setRequired: (e: CheckboxChangeEvent) => void;
}

export default function CreateAnnotationForm(props: Props) {
  let additionalInputForAnnotationType = null;
  if (props.annotationTypeName === ColumnType.DROPDOWN) {
    additionalInputForAnnotationType = (
      <>
        <FormControl
          label="Existing Dropdown Values"
          className={classNames(styles.formControl, styles.longForm)}
        >
          {props.existingAnnotationOptions &&
            props.existingAnnotationOptions.join(", ")}
        </FormControl>
        <FormControl
          label="New Dropdown Values"
          error={props.dropdownValuesError}
          className={styles.formControl}
        >
          <Select
            autoFocus={true}
            className={styles.select}
            mode="tags"
            onChange={(values: string[]) =>
              props.setDropdownValues(
                values.concat(props.existingAnnotationOptions || [])
              )
            }
            placeholder="New Dropdown Values"
            value={props.annotationOptions?.filter(
              (option) => !props.existingAnnotationOptions?.includes(option)
            )}
          />
        </FormControl>
      </>
    );
  }
  return (
    <form className={props.className}>
      <h4>Edit Annotation</h4>
      {additionalInputForAnnotationType}
      <Checkbox checked={props.required} onChange={props.setRequired}>
        Required
      </Checkbox>
      <div className={styles.buttonContainer}>
        {props.onCancel && (
          <Button className={styles.button} onClick={props.onCancel}>
            Cancel
          </Button>
        )}
        <Button
          className={styles.button}
          type="primary"
          onClick={props.saveAnnotation}
          disabled={props.isSaveDisabled}
        >
          Update
        </Button>
      </div>
    </form>
  );
}
