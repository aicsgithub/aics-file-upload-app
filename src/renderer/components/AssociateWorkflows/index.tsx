import { LabKeyOptionSelector } from "@aics/aics-react-labkey";
import { keys } from "lodash";
import * as React from "react";
import { ActionCreator } from "redux";

import { IdToFilesMap } from "../../containers/AssociateFiles/selectors";
import { RequestWorkflowOptionsAction } from "../../state/metadata/types";
import { GoBackAction, NextPageAction, SelectWorkflowsAction, Workflow } from "../../state/selection/types";
import {
    AssociateFilesAndWorkflowsAction,
    UndoFileWorkflowAssociationAction
} from "../../state/upload/types";
import FormPage from "../FormPage";
import SelectedAssociationsCard from "../SelectedAssociationsCard";

const styles = require("./style.pcss");

interface Props {
    associateFilesAndWorkflows: ActionCreator<AssociateFilesAndWorkflowsAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
    loadWorkflows: ActionCreator<RequestWorkflowOptionsAction>;
    goBack: ActionCreator<GoBackAction>;
    goForward: ActionCreator<NextPageAction>;
    mutualFiles: string[];
    redo: () => void;
    selectedFiles: string[];
    selectedWorkflows: Workflow[];
    selectWorkflows: ActionCreator<SelectWorkflowsAction>;
    undo: () => void;
    undoAssociation: ActionCreator<UndoFileWorkflowAssociationAction>;
    workflowOptions: Workflow[];
    workflowIdToFiles: IdToFilesMap;
}

class AssociateWorkflows extends React.Component<Props, {}> {
    public componentDidMount() {
        this.props.loadWorkflows();
    }

    public render() {
        const {
            canRedo,
            canUndo,
            className,
            mutualFiles,
            redo,
            selectedFiles,
            selectedWorkflows,
            selectWorkflows,
            undo,
            workflowOptions,
        } = this.props;

        return (
            <FormPage
                className={className}
                formTitle="ASSOCIATE WORKFLOWS"
                formPrompt="Associate files and workflows by selecting them and clicking Associate"
                onBack={this.props.goBack}
                onSave={this.props.goForward}
                saveButtonDisabled={!this.canContinue()}
            >
                <SelectedAssociationsCard
                    selectedWorkflows={selectedWorkflows}
                    files={mutualFiles}
                    selectedFilesCount={selectedFiles.length}
                    associate={this.associate}
                    canAssociate={this.canAssociate()}
                    undoAssociation={this.undoAssociation}
                    undoLastAssociation={undo}
                    redo={redo}
                    canRedo={canRedo}
                    canUndoLastAssociation={canUndo}
                />
                    <div className={styles.workflowSelector}>
                        <LabKeyOptionSelector
                            autoFocus={true}
                            label="Workflow"
                            multiSelect={true}
                            onOptionSelection={selectWorkflows}
                            optionIdKey="workflowId"
                            optionNameKey="name"
                            options={workflowOptions}
                            placeholder="Select Workflow(s)"
                            required={true}
                            selected={selectedWorkflows}
                        />
                    </div>
            </FormPage>
        );
    }

    private undoAssociation = (file: string): void => {
        this.props.undoAssociation(file, this.props.selectedWorkflows);
    }

    private canAssociate = (): boolean => {
        return this.props.selectedWorkflows.length > 0 && this.props.selectedFiles.length > 0;
    }

    private associate = (): void => {
        this.props.associateFilesAndWorkflows(this.props.selectedFiles, this.props.selectedWorkflows);
    }

    private canContinue = (): boolean => {
        return keys(this.props.workflowIdToFiles).length > 0;
    }
}

export default AssociateWorkflows;
