import { Popover } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";
import { editors } from "react-data-grid";

import WellsEditorPopover from "./WellsEditorPopover";
import WellsMassEditorPopover from "./WellsMassEditorPopover";

const styles = require("./styles.pcss");

/**
 * This is used in the CustomDataGrid when a user wants to edit a well field by clicking or hitting Enter.
 * It displays the currently selected well labels and a popover with the plate UI for associating more wells.
 */
class WellsEditor extends editors.EditorBase<
  AdazzleReactDataGrid.EditorBaseProps,
  {}
> {
  // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
  public input = React.createRef<HTMLDivElement>();

  public render() {
    const { rowData } = this.props;
    const content = rowData.massEditNumberOfFiles ? (
      <WellsMassEditorPopover rowData={rowData} />
    ) : (
      <WellsEditorPopover rowData={rowData} />
    );
    if (
      rowData.channel ||
      !isEmpty(rowData.positionIndexes) ||
      !isEmpty(rowData.scenes) ||
      !isEmpty(rowData.subImageNames)
    ) {
      return <div ref={this.input} className={styles.disabled} />;
    }

    return (
      <div ref={this.input}>
        <Popover
          placement="bottom"
          visible={true}
          content={content}
          title="Associate Wells with this row by selecting wells and clicking Associate"
        >
          <div className={styles.container} />
        </Popover>
      </div>
    );
  }

  // Should return an object of key/value pairs to be merged back to the row
  public getValue = () => {
    return { [this.props.column.key]: this.props.value };
  };

  public getInputNode = (): Element | Text | null => {
    return this.input.current;
  };
}

export default WellsEditor;
