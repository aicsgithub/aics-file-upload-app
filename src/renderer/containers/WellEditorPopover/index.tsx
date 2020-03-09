import { Button } from "antd";
import * as classNames from "classnames";
import { intersection, isEmpty } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { getSelectedWellIds } from "../../state/selection/selectors";
import { State } from "../../state/types";
import { associateFilesAndWells, undoFileWellAssociation } from "../../state/upload/actions";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUpload } from "../../state/upload/selectors";
import {
    AssociateFilesAndWellsAction,
    UndoFileWellAssociationAction,
    UploadStateBranch,
} from "../../state/upload/types";

import ImagingSessionSelector from "../ImagingSessionSelector";
import PlateContainer from "../PlateContainer";

const styles = require("./styles.pcss");

interface Props {
    associateFilesAndWells: ActionCreator<AssociateFilesAndWellsAction>;
    className?: string;
    file: string;
    positionIndex?: number;
    selectedWellIds: number[];
    undoFileWellAssociation: ActionCreator<UndoFileWellAssociationAction>;
    upload: UploadStateBranch;
}

/**
 * This renders the popover contents used for the WellEditor component of the CustomDataGrid
 * It is required to be connected to the redux store because react-data-grid editors follow a lifecycle in which
 * their props only update when the editor is activated (i.e. double-clicked). We want real-time updates so we're
 * bypassing this lifecycle.
 */
class WellEditorPopover extends React.Component<Props, {}> {
    public render() {
        const {
            className,
            file,
            positionIndex,
        } = this.props;

        return (
            <div>
                <div className={classNames(className, styles.row)}>
                    <ImagingSessionSelector className={styles.imagingSessionSelector}/>
                    <div className={styles.btns}>
                        <Button
                            onClick={this.associateWithRow}
                            type="primary"
                            className={styles.associateBtn}
                            disabled={this.associateBtnDisabled()}
                        >
                            Associate
                        </Button>
                        <Button
                            onClick={this.undoAssociation}
                            disabled={this.removeAssociationsBtnDisabled()}
                        >
                            Remove Association
                        </Button>
                    </div>
                </div>
                <PlateContainer
                    selectedFullPath={file}
                    selectedPositionIndex={positionIndex}
                />
            </div>
        );
    }

    private associateWithRow = (): void => {
        const { file, positionIndex }  = this.props;
        this.props.associateFilesAndWells([{ file, positionIndex }]);
    }

    private undoAssociation = (): void => {
        const { file, positionIndex }  = this.props;
        this.props.undoFileWellAssociation([file], positionIndex, false);
    }

    // disable if no wells selected or if none of the wells selected have been associated with
    // the row yet
    private removeAssociationsBtnDisabled = (): boolean => {
        const {
            file,
            positionIndex,
            selectedWellIds,
            upload,
        } = this.props;
        if (isEmpty(selectedWellIds)) {
            return true;
        }
        const uploadRow = upload[getUploadRowKey({file, positionIndex})];
        return !uploadRow || intersection(selectedWellIds, uploadRow.wellIds).length === 0;
    }

    // disable if no wells selected or if all of the wells have already been associated with
    // the row
    private associateBtnDisabled = (): boolean => {
        const {
            file,
            positionIndex,
            selectedWellIds,
            upload,
        } = this.props;
        if (isEmpty(selectedWellIds)) {
            return true;
        }
        const uploadRow = upload[getUploadRowKey({file, positionIndex})];
        return !uploadRow || intersection(selectedWellIds, uploadRow.wellIds).length === selectedWellIds.length;
    }
}

function mapStateToProps(state: State) {
    return {
        selectedWellIds: getSelectedWellIds(state),
        upload: getUpload(state),
    };
}

const dispatchToPropsMap = {
    associateFilesAndWells,
    undoFileWellAssociation,
};

export default connect(mapStateToProps, dispatchToPropsMap)(WellEditorPopover);
