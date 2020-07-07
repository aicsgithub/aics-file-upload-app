import { Button, DatePicker, Modal } from "antd";
import ButtonGroup from "antd/lib/button/button-group";
import { isEmpty, without } from "lodash";
import * as moment from "moment";
import * as React from "react";
import * as ReactDataGrid from "react-data-grid";

import { DATE_FORMAT, DATETIME_FORMAT } from "../../../constants";
import { ColumnType } from "../../../services/labkey-client/types";
import { convertToArray } from "../../../util";
import { FormatterProps } from "../index";

const styles = require("./styles.pcss");

// Describes the information needed for react-data-grid to display a row in this modal
interface TableRow {
  idx: number;
  [annotationName: string]: any;
}

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
  type?: ColumnType;
}

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
  column: EditorColumn;
}

interface DatesEditorState {
  selectedRows: number[];
  values: Array<moment.Moment | undefined>;
  visible: boolean;
}

/*
    This is a special kind of editor for the CustomDataGrid for annotations that support multiple values
    but need more screen space to do so: Dates and DateTimes.
 */
class DatesEditor extends React.Component<Props, DatesEditorState> {
  // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
  public input = React.createRef<HTMLDivElement>();

  private get columns() {
    return [
      {
        formatter: ({ row, value }: FormatterProps<TableRow>) => {
          const { type } = this.props.column;
          const isDatetime = type === ColumnType.DATETIME;
          return (
            <DatePicker
              autoFocus={true}
              className={styles.input}
              format={isDatetime ? DATETIME_FORMAT : DATE_FORMAT}
              onChange={this.updateRow(row)}
              value={value ? moment(value) : undefined}
              showTime={isDatetime}
            />
          );
        },
        key: this.props.column.key,
        name: this.props.column.key,
        resizable: true,
      },
    ];
  }

  constructor(props: Props) {
    super(props);
    const values =
      convertToArray(props.value).length === 0
        ? [null]
        : convertToArray(props.value);
    this.state = {
      selectedRows: [],
      values,
      visible: true,
    };
  }

  public render() {
    const { selectedRows, values, visible } = this.state;

    return (
      <div ref={this.input} className={styles.cell}>
        <Modal
          className={styles.container}
          width="50%"
          visible={visible}
          onOk={this.submit}
          onCancel={this.cancel}
          okText="Save"
        >
          <ButtonGroup className={styles.buttons}>
            <Button icon="plus" onClick={this.addRow} />
            <Button
              icon="minus"
              onClick={this.removeRow}
              disabled={isEmpty(selectedRows)}
            />
          </ButtonGroup>
          <ReactDataGrid
            columns={this.columns}
            rowGetter={this.rowGetter}
            rowsCount={values.length}
            rowSelection={{
              enableShiftSelect: true,
              onRowsDeselected: this.deselectRows,
              onRowsSelected: this.selectRows,
              selectBy: {
                indexes: selectedRows,
              },
            }}
          />
        </Modal>
      </div>
    );
  }

  // react-data-grid required method for accessing input
  public getInputNode = (): Element | Text | null => {
    return this.input.current;
  };

  // react-data-grid required method for accessing key/value
  public getValue = () => {
    const { values } = this.state;
    const {
      column: { key },
    } = this.props;
    return { [key]: values.filter((v) => !!v) };
  };

  private rowGetter = (idx: number) => {
    return { [this.props.column.key]: this.state.values[idx], idx };
  };

  private cancel = () => this.setState({ visible: false });

  private updateRow = (row: TableRow) => (value: any) => {
    const values = [...this.state.values];
    values[row.idx] = value;
    this.setState({ values });
  };

  private addRow = () =>
    this.setState({ values: [...this.state.values, undefined] });

  private removeRow = () => {
    const { selectedRows } = this.state;
    const values = [...this.state.values];
    selectedRows.forEach((r) => values.splice(r, 1));
    this.setState({
      selectedRows: [],
      values,
    });
  };

  private selectRows = (rows: Array<{ row: TableRow; rowIdx: number }>) => {
    const rowIndexes = rows.map((r) => r.rowIdx);
    this.setState({
      selectedRows: [...this.state.selectedRows, ...rowIndexes],
    });
  };

  private deselectRows = (rows: Array<{ row: TableRow; rowIdx: number }>) => {
    const rowIndexes = rows.map((r) => r.rowIdx);
    const selectedRows = without(this.state.selectedRows, ...rowIndexes);
    this.setState({ selectedRows });
  };

  private submit = () => {
    this.setState({ visible: false });
    this.props.onCommit();
  };
}

export default DatesEditor;
