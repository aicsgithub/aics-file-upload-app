import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import Plate from "../../components/Plate/index";
import SelectedWellsCard from "../../components/SelectedWellsCard/index";

import { goBack, goForward, selectWells } from "../../state/selection/actions";
import {
    getSelectedFiles,
    getSelectedWells,
    getWellsWithUnitsAndModified
} from "../../state/selection/selectors";
import { GoBackAction, NextPageAction, SelectWellsAction, Well } from "../../state/selection/types";
import { State } from "../../state/types";
import { associateFilesAndWell, jumpToUpload, undoFileWellAssociation } from "../../state/upload/actions";
import { getCanRedoUpload, getCanUndoUpload, getWellIdToFiles } from "../../state/upload/selectors";
import {
    AssociateFilesAndWellAction,
    JumpToUploadAction,
    UndoFileWellAssociationAction,
} from "../../state/upload/types";
import { getWellLabel } from "../../util";

import { AicsGridCell } from "@aics/aics-react-labkey";
import { GridCell } from "./grid-cell";

const styles = require("./style.pcss");

interface AssociateWellsProps {
    associateFilesAndWell: ActionCreator<AssociateFilesAndWellAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    selectedFiles: string[];
    selectedWells: AicsGridCell[];
    selectWells: ActionCreator<SelectWellsAction>;
    wells?: Well[][];
    wellIdToFiles: Map<number, string[]>;
    jumpToUpload: ActionCreator<JumpToUploadAction>;
    undoAssociation: ActionCreator<UndoFileWellAssociationAction>;
}

class AssociateWells extends React.Component<AssociateWellsProps, {}> {
    constructor(props: AssociateWellsProps) {
        super(props);
        this.associate = this.associate.bind(this);
        this.selectWells = this.selectWells.bind(this);
        this.canAssociate = this.canAssociate.bind(this);
        this.undoAssociation = this.undoAssociation.bind(this);
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
    }

    public render() {
        const { className, canRedo, canUndo, selectedFiles, selectedWells, wells, wellIdToFiles } = this.props;
        const wellLabels = selectedWells.map((well) => getWellLabel(well));
        const selectedWellsData = wells ? selectedWells.map((well) => wells[well.row][well.col]) : [];
        const files = [...selectedWellsData.reduce((set, well) => {
            const filesForWell = wellIdToFiles.get(well.wellId);
            if (filesForWell) {
                filesForWell.forEach((file) => {
                    set.add(file);
                });
            }
            return set;
        }, new Set())];

        return (
            <FormPage
                className={className}
                formTitle="ASSOCIATE WELLS"
                formPrompt="Associate files and wells by selecting them and clicking Associate"
                onBack={this.props.goBack}
                onSave={this.props.goForward}
                saveButtonDisabled={!this.canContinue()}
            >
                <SelectedWellsCard
                    className={styles.wellInfo}
                    selectedWells={selectedWellsData}
                    wellLabels={wellLabels}
                    files={files || []}
                    selectedFilesCount={selectedFiles.length}
                    associate={this.associate}
                    canAssociate={this.canAssociate()}
                    undoAssociation={this.undoAssociation}
                    undoLastAssociation={this.undo}
                    redo={this.redo}
                    canRedo={canRedo}
                    canUndoLastAssociation={canUndo}
                />
                {wells ? (
                        <Plate
                            wells={wells}
                            onWellClick={this.selectWells}
                            selectedWells={selectedWells}
                            wellIdToFiles={wellIdToFiles}
                        />
                    ) : <span>Plate does not have any well information!</span>}
            </FormPage>
        );
    }

    public selectWells(cells: AicsGridCell[]): void {
        const gridCells = cells.map((cell) => new GridCell(cell.row, cell.col));
        this.props.selectWells(gridCells);
    }

    private undoAssociation(file: string): void {
        const { selectedWells, wells } = this.props;
        const wellIds = wells ? selectedWells.map((well) => wells[well.row][well.col].wellId) : [];
        const wellLabels = wells ? selectedWells.map((well) => getWellLabel(well)) : [];
        this.props.undoAssociation(file, wellIds, wellLabels);
    }

    private canAssociate(): boolean {
        const { selectedFiles, selectedWells } = this.props;
        return selectedWells.length > 0 && selectedFiles.length > 0;
    }

    private associate(): void {
        const { wells } = this.props;

        if (this.canAssociate() && wells) {
            const { selectedFiles, selectedWells } = this.props;
            const wellLabels = selectedWells.map((well) => getWellLabel(well));
            const wellIds = selectedWells.map((well) => wells[well.row][well.col].wellId);
            this.props.associateFilesAndWell(selectedFiles, wellIds, wellLabels);
        }
    }

    private undo(): void {
        this.props.jumpToUpload(-1);
    }

    private redo(): void {
        this.props.jumpToUpload(1);
    }

    private canContinue = (): boolean => {
        return this.props.wellIdToFiles.size > 0;
    }
}

function mapStateToProps(state: State) {
    return {
        canRedo: getCanRedoUpload(state),
        canUndo: getCanUndoUpload(state),
        selectedFiles: getSelectedFiles(state),
        selectedWells: getSelectedWells(state),
        wellIdToFiles: getWellIdToFiles(state),
        wells: getWellsWithUnitsAndModified(state),
    };
}

const dispatchToPropsMap = {
    associateFilesAndWell,
    goBack,
    goForward,
    jumpToUpload,
    selectWells,
    undoAssociation: undoFileWellAssociation,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AssociateWells);
