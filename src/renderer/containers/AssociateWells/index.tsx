import { AicsGridCell } from "@aics/aics-react-labkey";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import FormPage from "../../components/FormPage";
import Plate from "../../components/Plate/index";
import SelectedWellsCard from "../../components/SelectedWellsCard/index";

import { goBack, goForward, selectWells } from "../../state/selection/actions";
import {
    getMutualFiles,
    getSelectedFiles, getSelectedWellLabels,
    getSelectedWells, getSelectedWellsWithData,
    getWellsWithUnitsAndModified
} from "../../state/selection/selectors";
import { GoBackAction, NextPageAction, SelectWellsAction, Well } from "../../state/selection/types";
import { State } from "../../state/types";
import { associateFilesAndWells, jumpToUpload, undoFileWellAssociation } from "../../state/upload/actions";
import { getCanRedoUpload, getCanUndoUpload, getWellIdToFiles } from "../../state/upload/selectors";
import {
    AssociateFilesAndWellsAction,
    JumpToUploadAction,
    UndoFileWellAssociationAction,
} from "../../state/upload/types";
import { getWellLabel } from "../../util";

import { GridCell } from "./grid-cell";

const styles = require("./style.pcss");

interface AssociateWellsProps {
    associateFilesAndWell: ActionCreator<AssociateFilesAndWellsAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    mutualFiles: string[];
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    selectedFiles: string[];
    selectedWellLabels: string[];
    selectedWells: AicsGridCell[];
    selectedWellsData: Well[];
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
        const {
            className,
            canRedo,
            canUndo,
            selectedFiles,
            selectedWells,
            selectedWellLabels,
            wells,
            wellIdToFiles,
        } = this.props;

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
                    selectedWells={this.props.selectedWellsData}
                    wellLabels={selectedWellLabels}
                    files={this.props.mutualFiles}
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
        const { wells } = this.props;
        if (wells) {
            const filledCells = cells.filter((cell) =>
                wells[cell.row][cell.col].solutions.length || wells[cell.row][cell.col].cellPopulations.length);
            const gridCells = filledCells.map((cell) => new GridCell(cell.row, cell.col));
            this.props.selectWells(gridCells);
        }
    }

    private undoAssociation(file: string): void {
        const { selectedWells, selectedWellLabels, wells } = this.props;
        if (wells) {
            const wellIds = selectedWells.map((well) => wells[well.row][well.col].wellId);
            this.props.undoAssociation(file, wellIds, selectedWellLabels);
        }
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
        mutualFiles: getMutualFiles(state),
        selectedFiles: getSelectedFiles(state),
        selectedWellLabels: getSelectedWellLabels(state),
        selectedWells: getSelectedWells(state),
        selectedWellsData: getSelectedWellsWithData(state),
        wellIdToFiles: getWellIdToFiles(state),
        wells: getWellsWithUnitsAndModified(state),
    };
}

const dispatchToPropsMap = {
    associateFilesAndWell: associateFilesAndWells,
    goBack,
    goForward,
    jumpToUpload,
    selectWells,
    undoAssociation: undoFileWellAssociation,
};

export default connect(mapStateToProps, dispatchToPropsMap)(AssociateWells);
