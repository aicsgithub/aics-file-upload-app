import { Input, Select, Radio } from "antd";
import Logger from "js-logger";
import { trim } from "lodash";
import * as React from "react";
import { editors } from "react-data-grid";

import { LIST_DELIMITER_JOIN, LIST_DELIMITER_SPLIT } from "../../../constants";
import LookupSearch from "../../../containers/LookupSearch";
import { ColumnType } from "../../../services/labkey-client/types";

const styles = require("./styles.pcss");

const { Option } = Select;

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
  dropdownValues?: string[];
  type?: ColumnType;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
  column: EditorColumn;
}

interface EditorState {
  value: any[] | string;
}

/*
    This is the editor for the UploadJobGrid, the purpose of this is to
    dynamically determine the editor based on which `type` the Editor is
    supplied and use that to render an appropriate form. Note that the field
    `input` and the methods `getValue` & `getInputNode` are required and used by
    the React-Data-Grid additionally, the element you return must contain an
    Input element.
 */
class Editor extends editors.EditorBase<EditorProps, EditorState> {
  // This ref is here so that the DataGrid doesn't throw a fit, normally it
  // would use this to .focus() the input
  public container = React.createRef<HTMLDivElement>();
  public input = React.createRef<Input>();

  public constructor(props: EditorProps) {
    super(props);
    let value: any[] | string = [...(props.value ?? [])];
    if (
      props.column.type === ColumnType.TEXT ||
      props.column.type === ColumnType.NUMBER
    ) {
      if (props.column.type === ColumnType.NUMBER) {
        value = value.filter((v) => !Number.isNaN(Number(v)));
      }
      value = value.join(LIST_DELIMITER_JOIN);
    } else if (props.column.type === ColumnType.BOOLEAN) {
      value = value.map(Boolean);
    } else if (props.column.type === ColumnType.DROPDOWN) {
      value = value.filter((v: string) =>
        this.props.column.dropdownValues?.includes(v)
      );
    }
    this.state = { value };
  }

  public render() {
    const {
      column: { dropdownValues, type },
    } = this.props;
    const { value } = this.state;
    let input;
    switch (type) {
      case ColumnType.DROPDOWN:
        input = (
          <Select
            allowClear={true}
            autoFocus={true}
            defaultOpen={true}
            mode="multiple"
            onChange={this.handleOnChange}
            style={{ width: "100%" }}
            value={value}
          >
            {dropdownValues &&
              dropdownValues.map((dropdownValue: string) => (
                <Option key={dropdownValue}>{dropdownValue}</Option>
              ))}
          </Select>
        );
        break;
      case ColumnType.BOOLEAN:
        input = (
          <Radio.Group
            value={value[0]}
            onChange={() => this.handleOnChange([!value[0]])}
            className={styles.booleanEditorContainer}
          >
            <Radio.Button value={true} className={styles.booleanEditorBtnYes}>
              Yes
            </Radio.Button>
            <Radio.Button value={false} className={styles.booleanEditorBtnNo}>
              No
            </Radio.Button>
          </Radio.Group>
        );
        break;
      case ColumnType.NUMBER:
      case ColumnType.TEXT:
        input = <Input ref={this.input} defaultValue={this.state.value} />;
        break;
      case ColumnType.LOOKUP:
        input = (
          <LookupSearch
            defaultOpen={true}
            key={this.props.column.key}
            mode="multiple"
            lookupAnnotationName={this.props.column.key}
            selectSearchValue={this.handleOnChange}
            value={value}
          />
        );
        break;
      default:
        Logger.error("Invalid column type supplied");
        input = "ERROR";
    }

    return (
      <div ref={this.container} onBlur={this.props.onCommit}>
        {input}
      </div>
    );
  }

  // Should return an object of key/value pairs to be merged back to the row
  public getValue = () => {
    const {
      column: { key, type },
    } = this.props;

    if (
      (type === ColumnType.TEXT || type === ColumnType.NUMBER) &&
      this.input.current
    ) {
      const value = this.input.current.input.value;
      let formattedString = trim(value);
      if (value.endsWith(LIST_DELIMITER_SPLIT)) {
        formattedString = value.substring(0, value.length - 1);
      }
      return { [key]: formattedString };
    }

    return { [key]: this.state.value };
  };

  public getInputNode = (): Element | Text | null => {
    return this.input.current
      ? this.input.current.input
      : this.container.current;
  };

  private handleOnChange = (value: any[] | string) => {
    this.setState({ value });
  };
}

export default Editor;
