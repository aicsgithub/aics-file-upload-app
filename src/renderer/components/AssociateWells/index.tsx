import { AicsGridCell } from "@aics/aics-react-labkey";
import { Tabs } from "antd";
import { keys } from "lodash";
import * as React from "react";
import { ActionCreator } from "redux";

import { IdToFilesMap } from "../../containers/AssociateFiles/selectors";
import { GoBackAction, NextPageAction, SelectWellsAction, Well } from "../../state/selection/types";
import {
    AssociateFilesAndWellsAction,
    UndoFileWellAssociationAction,
} from "../../state/upload/types";
import { getWellLabel } from "../../util";

import FormPage from "../FormPage";
import Plate from "../Plate";
import SelectedAssociationsCard from "../SelectedAssociationsCard";
import WellInfo from "../SelectedAssociationsCard/WellInfo";

import { GridCell } from "./grid-cell";

const styles = require("./style.pcss");

interface AssociateWellsProps {
    associateFilesAndWells: ActionCreator<AssociateFilesAndWellsAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    mutualFilesForWells: string[];
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    redo: () => void;
    selectedFiles: string[];
    selectedWellLabels: string[];
    selectedWells: AicsGridCell[];
    selectedWellsData: Well[];
    selectWells: ActionCreator<SelectWellsAction>;
    undo: () => void;
    wells?: Well[][];
    wellIdToFiles: IdToFilesMap;
    undoAssociation: ActionCreator<UndoFileWellAssociationAction>;
}

class AssociateWells extends React.Component<AssociateWellsProps, {}> {
    public render() {
        const {
            className,
            canRedo,
            canUndo,
            goBack,
            goForward,
            mutualFilesForWells,
            redo,
            selectedFiles,
            selectedWellsData,
            selectedWells,
            selectedWellLabels,
            undo,
            wells,
            wellIdToFiles,
        } = this.props;

        const associationsTitle = `Selected Well(s): ${selectedWellLabels.sort().join(", ")}`;

        return (
            <FormPage
                className={className}
                formTitle="ASSOCIATE WELLS"
                formPrompt="Associate files and wells by selecting them and clicking Associate"
                onBack={goBack}
                onSave={goForward}
                saveButtonDisabled={!this.canContinue()}
            >
                <SelectedAssociationsCard
                    className={styles.wellInfo}
                    files={mutualFilesForWells}
                    selectedFilesCount={selectedFiles.length}
                    associate={this.associate}
                    canAssociate={this.canAssociate()}
                    undoAssociation={this.undoAssociation}
                    undoLastAssociation={undo}
                    redo={redo}
                    canRedo={canRedo}
                    canUndoLastAssociation={canUndo}
                    useWells={true}
                    title={associationsTitle}
                >
                    {selectedWellsData && selectedWellsData.map((well, i) => (
                        <Tabs.TabPane
                            key={selectedWellLabels[i]}
                            tab={selectedWellLabels[i]}
                        >
                            <WellInfo className={styles.tabPane} well={well}/>
                        </Tabs.TabPane>
                    ))}
                </SelectedAssociationsCard>
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

    public selectWells = (cells: AicsGridCell[]): void => {
        const { wells } = this.props;
        if (wells) {
            const filledCells = cells.filter((cell) => wells[cell.row][cell.col].modified);
            const gridCells = filledCells.map((cell) => new GridCell(cell.row, cell.col));
            this.props.selectWells(gridCells);
        }
    }

    private undoAssociation = (file: string): void => {
        const { selectedWells, selectedWellLabels, wells } = this.props;
        if (wells) {
            const wellIds = selectedWells.map((well) => wells[well.row][well.col].wellId);
            this.props.undoAssociation(file, wellIds, selectedWellLabels);
        }
    }

    // If we have wells & files selected then allow the user to Associate them
    private canAssociate = (): boolean => {
        const { selectedFiles, selectedWells } = this.props;
        return selectedWells.length > 0 && selectedFiles.length > 0;
    }

    private associate = (): void => {
        const { wells } = this.props;

        if (this.canAssociate() && wells) {
            const { selectedFiles, selectedWells } = this.props;
            const wellLabels = selectedWells.map((well) => getWellLabel(well));
            const wellIds = selectedWells.map((well) => wells[well.row][well.col].wellId);
            this.props.associateFilesAndWells(selectedFiles, wellIds, wellLabels);
        }
    }

    // If we at least one well associated with at least one file then we can continue the upload
    private canContinue = (): boolean => {
        return keys(this.props.wellIdToFiles).length > 0;
    }
}

export default AssociateWells;
