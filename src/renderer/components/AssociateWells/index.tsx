import { AicsGridCell } from "@aics/aics-react-labkey";
import { Tabs } from "antd";
import * as React from "react";
import { ActionCreator } from "redux";

import ImagingSessionSelector from "../../containers/ImagingSessionSelector";
import { GoBackAction, NextPageAction, Page } from "../../state/route/types";
import { SelectWellsAction, Well } from "../../state/selection/types";
import { AssociateFilesAndWellsAction, UndoFileWellAssociationAction } from "../../state/upload/types";

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
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    mutualFilesForWells: string[];
    redo: () => void;
    selectedFiles: string[];
    selectedWellLabels: string[];
    selectedWells: AicsGridCell[];
    selectedWellsData: Well[];
    selectWells: ActionCreator<SelectWellsAction>;
    undo: () => void;
    wells?: Well[][];
    wellsWithAssociations: number[]; // wells with Associations will be displayed as green
    undoAssociation: ActionCreator<UndoFileWellAssociationAction>;
}

/**
 * Displays a read only version of the Plate UI and all of the selected files and wells
 * to associate them together.
 */
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
            wellsWithAssociations,
        } = this.props;

        const associationsTitle = `Selected Wells: ${selectedWellLabels.sort().join(", ")}`;

        return (
            <FormPage
                className={className}
                formTitle="ASSOCIATE WELLS"
                formPrompt="Associate files and wells by selecting them and clicking Associate"
                onBack={goBack}
                onSave={goForward}
                saveButtonDisabled={!this.canContinue()}
                page={Page.AssociateFiles}
            >
                <SelectedAssociationsCard
                    className={styles.wellInfo}
                    files={mutualFilesForWells}
                    selectedFilesCount={selectedFiles.length}
                    associate={this.associate}
                    canAssociate={this.canAssociate()}
                    undoAssociation={this.props.undoAssociation}
                    undoLastAssociation={undo}
                    redo={redo}
                    canRedo={canRedo}
                    canUndoLastAssociation={canUndo}
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
                <ImagingSessionSelector/>
                {wells ? (
                        <Plate
                            wells={wells}
                            onWellClick={this.selectWells}
                            selectedWells={selectedWells}
                            wellsWithAssociations={wellsWithAssociations}
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

    // If we have wells & files selected then allow the user to Associate them
    private canAssociate = (): boolean => {
        const { selectedFiles, selectedWells } = this.props;
        return selectedWells.length > 0 && selectedFiles.length > 0;
    }

    private associate = (): void => {
        if (this.canAssociate()) {
            const { selectedFiles } = this.props;
            this.props.associateFilesAndWells(selectedFiles);
        }
    }

    // If we at least one well associated with at least one file then we can continue the upload
    private canContinue = (): boolean => {
        return this.props.wellsWithAssociations.length > 0;
    }
}

export default AssociateWells;
