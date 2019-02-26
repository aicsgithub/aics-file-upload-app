import { AicsGridCell } from "aics-react-labkey";
import { Button, Card, Col, Row, Statistic } from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import Plate from "../../components/Plate/index";

import {
    State,
} from "../../state";
import { setWellsForUpload } from "../../state/selection/actions";
import {
    getSelectedFile,
    getSelectedWellAndFileAreAssociated,
    getWellForUpload,
    getWellsWithUnitsAndModified
} from "../../state/selection/selectors";
import { SetWellsForUploadAction, Well } from "../../state/selection/types";
import { associateFileAndWell, undoFileWellAssociation } from "../../state/upload/actions";
import { getWellIdToFileCount } from "../../state/upload/selectors";
import { AssociateFileAndWellAction, UndoFileWellAssociationAction } from "../../state/upload/types";

const styles = require("./style.css");

interface AssociateWellsProps {
    associateFileAndWell: ActionCreator<AssociateFileAndWellAction>;
    className?: string;
    selectedFile?: string;
    selectedWell?: AicsGridCell;
    setWellsForUpload: ActionCreator<SetWellsForUploadAction>;
    wells?: Well[][];
    wellIdToFileCount: Map<number, number>;
    selectedWellAndFileAreAssociated: boolean;
    undoAssociation: ActionCreator<UndoFileWellAssociationAction>;
}

class AssociateWells extends React.Component<AssociateWellsProps, {}> {
    constructor(props: AssociateWellsProps) {
        super(props);
        this.associate = this.associate.bind(this);
        this.selectWell = this.selectWell.bind(this);
        this.getSelectedWell = this.getSelectedWell.bind(this);
        this.canAssociate = this.canAssociate.bind(this);
        this.canUndoAssociation = this.canUndoAssociation.bind(this);
        this.undoAssociation = this.undoAssociation.bind(this);
    }

    public render() {
        const { className, selectedFile, selectedWell, wells, wellIdToFileCount } = this.props;
        const selectedWells = selectedWell ? [selectedWell] : [];

        return (
            <FormPage
                className={className}
                formTitle="ASSOCIATE WELLS"
                formPrompt="Associate files and wells by selecting them and clicking Associate"
                saveButtonDisabled={true}
            >
                <Card className={styles.form}>
                    <Row className={styles.associateRow}>
                        <Col span={4}>
                            <Statistic title="Selected Well" value={this.getSelectedWell()} />
                        </Col>
                        <Col span={20}>
                            <Statistic title="Selected File" value={selectedFile || "None"}/>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={4}>
                            <Button
                                type="primary"
                                disabled={!this.canAssociate()}
                                onClick={this.associate}
                            >
                                Associate
                            </Button>
                        </Col>
                        <Col span={4}>
                            <Button
                                type="default"
                                disabled={!this.canUndoAssociation()}
                                onClick={this.undoAssociation}
                            >
                                Undo Association
                            </Button>
                        </Col>
                    </Row>

                </Card>

                {wells ? (
                        <Plate
                            wells={wells}
                            onWellClick={this.selectWell}
                            selectedWells={selectedWells}
                            wellIdToFileCount={wellIdToFileCount}
                        />
                    ) : <span>Plate does not have any well information!</span>}
            </FormPage>
        );
    }

    public selectWell(row: number, col: number): void {
        this.props.setWellsForUpload([{row, col}]);
    }

    private canAssociate(): boolean {
        return !!(this.props.selectedFile && this.props.selectedWell) && !this.props.selectedWellAndFileAreAssociated;
    }

    private associate(): void {
        const { selectedWell, wells } = this.props;

        if (this.canAssociate() && selectedWell && wells) {
            const { selectedFile } = this.props;
            this.setState({selectedWell: undefined});
            const wellId = wells[selectedWell.row][selectedWell.col].wellId;
            this.props.associateFileAndWell(selectedFile, wellId, selectedWell);
        }
    }

    private canUndoAssociation(): boolean {
        return this.props.selectedWellAndFileAreAssociated;
    }

    private undoAssociation(): void {
        if (this.canUndoAssociation()) {
            this.props.undoAssociation(this.props.selectedFile);
        }
    }

    private getSelectedWell(): string {
        const { selectedWell } = this.props;

        // todo none text const
        // todo B6 rather than 2, 6
        return selectedWell ? `${selectedWell.row}, ${selectedWell.col}` : "None";
    }
}

function mapStateToProps(state: State) {
    return {
        selectedFile: getSelectedFile(state),
        selectedWell: getWellForUpload(state),
        selectedWellAndFileAreAssociated: getSelectedWellAndFileAreAssociated(state),
        wellIdToFileCount: getWellIdToFileCount(state),
        wells: getWellsWithUnitsAndModified(state),
    };
}

const dispatchToPropsMap = {
    associateFileAndWell,
    setWellsForUpload,
    undoAssociation: undoFileWellAssociation,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AssociateWells);
