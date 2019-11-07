import { Alert, Button, Icon, Modal } from "antd";
import ButtonGroup from "antd/lib/button/button-group";
import { castArray, isEmpty, without } from "lodash";
import * as moment from "moment";
import * as React from "react";
import * as ReactDataGrid from "react-data-grid";
import { DATE_FORMAT, DATETIME_FORMAT } from "../../../constants";

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
                formatter: ({ row, value }: FormatterProps<TableRow>) => (
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
        const { annotationType } = this.props;
        const {error, selectedRows, values, visible} = this.state;
        let formattedValue;
        if (annotationType === ColumnType.DATE) {
            formattedValue = values.map((v) => moment(v).format(DATE_FORMAT)).join(", ");
        } else if (annotationType === ColumnType.DATETIME) {
            formattedValue = values.map((v) => moment(v).format(DATETIME_FORMAT)).join(", ");
        } else {
            formattedValue = values.map((v) => v ? "Yes" : "No").join(", ");
        }

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
                <div className={styles.cell}>
                    <span>{formattedValue}</span>
                    <Icon
                        className={styles.cellBtn}
                        onClick={this.openModal}
                        type={isEmpty(values) ? "plus-circle" : "edit"}
                    />
                </div>
            </>
        );
    }

    private rowGetter = (idx: number) => {
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
        let nextValue: any = false;
        const {annotationType} = this.props;
        if (annotationType === ColumnType.DATE || annotationType === ColumnType.DATETIME) {
            nextValue = new Date();
        }

        this.setState({values: [...this.state.values, nextValue]});
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
        let {values} = this.state;
        const {annotationName, annotationType, row} = this.props;
        if (annotationName && row) {
            if (annotationType === ColumnType.DATETIME || annotationType === ColumnType.DATE) {
                values = values
                    .filter((v) => !!v)
                    .map((m) => {
                        return m instanceof Date ? m : m.toDate();
                    });
            }
            this.props.onOk(values, annotationName, row);
            this.setState({visible: false});
        } else {
            this.setState({error: "AnnotationName or Row info not provided. Contact Software."});
        }
    }
}

export default AddValuesModal;
