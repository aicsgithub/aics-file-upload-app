import { Alert, Button, Icon, Modal } from "antd";
import ButtonGroup from "antd/lib/button/button-group";
import { castArray, isEmpty, without } from "lodash";
import * as React from "react";
import * as ReactDataGrid from "react-data-grid";

import { ColumnType } from "../../../state/template/types";
import { UploadJobTableRow, UploadMetadata } from "../../../state/upload/types";
import Editor from "../Editor";
import { FormatterProps } from "../index";

const styles = require("./styles.pcss");

interface TableRow {
    idx: number;
    [annotationName: string]: any;
}

interface Props {
    annotationName: string;
    annotationType: ColumnType;
    onOk: (value: any, key: keyof UploadMetadata, row: UploadJobTableRow) => void;
    row: UploadJobTableRow;
    values?: any[];
}

interface AddValuesModalState {
    draft?: any;
    error?: string;
    selectedRows: number[];
    values: any[];
    visible: boolean;
}

// this is for special cases - dates/datetimes/booleans when multiple values are allowed
class AddValuesModal extends React.Component<Props, AddValuesModalState> {
    private get columns() {
        return [
            {
                formatter: ({ row, value }: FormatterProps) => (
                    <Editor onChange={this.updateRow(row)} type={this.props.annotationType} value={value}/>
                ),
                key: this.props.annotationName,
                name: this.props.annotationName,
                resizable: true,
            },
        ];
    }

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedRows: [],
            values: props.values ? castArray(props.values) : [],
            visible: false,
        };
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.values !== this.props.values) {
            this.setState({
                values: this.props.values ? castArray(this.props.values) : [],
            });
        }
    }

    public render() {
        const {error, selectedRows, values, visible} = this.state;
console.log(values);
        return (
            <>
                <Modal
                    className={styles.container}
                    width="90%"
                    title="Add Values"
                    visible={visible}
                    onOk={this.submit}
                    onCancel={this.cancel}
                    okText="Save"
                >
                    <ButtonGroup className={styles.buttons}>
                        <Button icon="plus" onClick={this.addRow}/>
                        <Button icon="minus" onClick={this.removeRow}/>
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
                    {error && <Alert type="error" message="Could not save values" description={error}/>}
                </Modal>
                <div>
                    <Icon onClick={this.openModal} type={isEmpty(values) ? "plus-circle" : "edit"}/>
                </div>
            </>
        );
    }

    private rowGetter = (idx: number) => {
        console.log("get row")
        return ({[this.props.annotationName]: this.state.values[idx], idx});
    }
    private openModal = () => this.setState({visible: true});
    private cancel = () => this.setState({visible: false});

    private updateRow = (row: TableRow) => (value: any) => {
        const values = [...this.state.values];
        values[row.idx] = value;
        this.setState({values});
    }
    private addRow = () => {
        this.setState({values: [...this.state.values, undefined]});
    }
    private removeRow = () => {
        const { selectedRows } = this.state;
        const values = [...this.state.values];
        if (selectedRows.length) {
            selectedRows.forEach((r) => values.splice(r, 1));
            this.setState({
                selectedRows: [],
                values,
            });
        }
    }

    private selectRows = (rows: Array<{row: TableRow, rowIdx: number}>) => {
        const rowIndexes = rows.map((r) => r.rowIdx);
        this.setState({selectedRows:  [...this.state.selectedRows, ...rowIndexes] });
    }

    private deselectRows = (rows: Array<{row: TableRow, rowIdx: number}>) => {
        const rowIndexes = rows.map((r) => r.rowIdx);
        const selectedRows = without(this.state.selectedRows, ...rowIndexes);
        this.setState({selectedRows});
    }

    private submit = () => {
        const {values} = this.state;
        const {annotationName, row} = this.props;
        if (annotationName && row) {
            this.props.onOk(values, annotationName, row);
        } else {
            this.setState({error: "AnnotationName or Row info not provided. Contact Software."});
        }
    }
}

export default AddValuesModal;
