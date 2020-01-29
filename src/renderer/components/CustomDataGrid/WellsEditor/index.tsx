import { Button, Popover } from "antd";
import { ReactNode } from "react";
import * as React from "react";
import { editors } from "react-data-grid";
import { ActionCreator } from "redux";

import ImagingSessionSelector from "../../../containers/ImagingSessionSelector";
import PlateContainer from "../../../containers/PlateContainer";
import { SelectWellsAction } from "../../../state/selection/types";
import { AssociateFilesAndWellsAction, UploadStateBranch } from "../../../state/upload/types";

const styles = require("./styles.pcss");

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
    associateFilesAndWells: ActionCreator<AssociateFilesAndWellsAction>;
    associatedWellIds: number[];
    fullPath: string;
    positionIndex?: number;
    selectWells: ActionCreator<SelectWellsAction>;
    selectedWellLabels?: string;
    upload: UploadStateBranch;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
    column: EditorColumn;
    width?: string;
}

class WellsEditor extends editors.EditorBase<EditorProps, {}> {
    // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
    public input = React.createRef<HTMLDivElement>();

    public render() {
        const {
            column: {
                selectedWellLabels,
            },
        } = this.props;

        return (
            <div ref={this.input}>
                <Popover
                    placement="bottom"
                    visible={true}
                    content={this.renderPopover()}
                    title="Associate Wells"
                >
                    <div className={styles.labels}>{selectedWellLabels}</div>
                </Popover>
            </div>
        );
    }

    // Should return an object of key/value pairs to be merged back to the row
    public getValue = () => {
        return { [this.props.column.key]: this.props.value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }

    private renderPopover(): ReactNode {
        const { rowData: { file, positionIndex } }  = this.props;
        return (
            <div>
                <ImagingSessionSelector/>
                <PlateContainer
                    selectedFullPath={file}
                    selectedPositionIndex={positionIndex}
                />
                <Button onClick={this.associateWithFileRow} type="primary">Associate</Button>
            </div>
        );
    }

    private associateWithFileRow = () => {
        const { rowData: { file, positionIndex } }  = this.props;
        this.props.column.associateFilesAndWells([file], positionIndex);
    }
}

export default WellsEditor;
