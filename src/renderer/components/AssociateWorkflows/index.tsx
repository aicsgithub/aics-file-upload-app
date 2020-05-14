import { Tabs } from "antd";
import * as React from "react";
import { ActionCreator } from "redux";

import { WORKFLOW_ANNOTATION_NAME } from "../../constants";
import LookupSearch from "../../containers/LookupSearch";
import { GoBackAction, NextPageAction, Page } from "../../state/route/types";
import { SelectWorkflowsAction, Workflow } from "../../state/selection/types";
import {
    AssociateFilesAndWorkflowsAction,
    UndoFileWorkflowAssociationAction
} from "../../state/upload/types";

import FormPage from "../FormPage";
import SelectedAssociationsCard from "../SelectedAssociationsCard";
import KeyValueDisplay from "../SelectedAssociationsCard/KeyValueDisplay";

const styles = require("./style.pcss");

interface Props {
    associateFilesAndWorkflows: ActionCreator<AssociateFilesAndWorkflowsAction>;
    canRedo: boolean;
    canUndo: boolean;
    className?: string;
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
    workflowsWithAssociations: string[];
}

/**
 * Displays a workflow selector and the selected files and allows users to associate files and workflows together.
 */
class AssociateWorkflows extends React.Component<Props, {}> {
    public render() {
        const {
            canRedo,
            canUndo,
            className,
            mutualFiles,
            redo,
            selectedFiles,
            selectedWorkflows,
            undo,
        } = this.props;

        const selectedWorkflowNames: string[] = selectedWorkflows.map((workflow: Workflow) => workflow.name);
        const associationsTitle = `Selected Workflows: ${selectedWorkflowNames.sort().join()}`;

        return (
            <FormPage
                className={className}
                formTitle="ASSOCIATE WORKFLOWS"
                formPrompt="Associate files and workflows by selecting them and clicking Associate"
                onBack={this.props.goBack}
                onSave={this.props.goForward}
                saveButtonDisabled={!this.canContinue()}
                page={Page.AssociateFiles}
            >
                <SelectedAssociationsCard
                    files={mutualFiles}
                    selectedFilesCount={selectedFiles.length}
                    associate={this.associate}
                    canAssociate={this.canAssociate()}
                    undoAssociation={this.undoAssociation}
                    undoLastAssociation={undo}
                    redo={redo}
                    canRedo={canRedo}
                    canUndoLastAssociation={canUndo}
                    title={associationsTitle}
                >
                    {selectedWorkflows && selectedWorkflows.map(({ description,
                                                                      name,
                                                                      workflowId }: Workflow) => (
                        <Tabs.TabPane
                            key={`${workflowId}`}
                            tab={name}
                        >
                            <KeyValueDisplay className={styles.workflowInfo} keyName="Name" value={name}/>
                            <KeyValueDisplay
                                className={styles.workflowInfo}
                                keyName="Description"
                                value={description}
                            />
                        </Tabs.TabPane>
                    ))}
                </SelectedAssociationsCard>
                    <div className={styles.workflowSelectorContainer}>
                        <p className={styles.workflowLabel}>Workflows</p>
                        <LookupSearch
                            className={styles.selector}
                            lookupAnnotationName={WORKFLOW_ANNOTATION_NAME}
                            mode="multiple"
                            placeholder="Select Workflows"
                            selectSearchValue={this.selectWorkflows}
                            value={selectedWorkflowNames}
                        />
                    </div>
            </FormPage>
        );
    }

    private selectWorkflows = (names: string[]): void => {
        const workflows = this.props.workflowOptions.filter((workflow) => names.includes(workflow.name));
        this.props.selectWorkflows(workflows);
    }

    private undoAssociation = (file: string): void => {
        this.props.undoAssociation(file, this.props.selectedWorkflows);
    }

    // If we have workflows & files selected then allow the user to Associate them
    private canAssociate = (): boolean => {
        return this.props.selectedWorkflows.length > 0 && this.props.selectedFiles.length > 0;
    }

    private associate = (): void => {
        this.props.associateFilesAndWorkflows(this.props.selectedFiles, this.props.selectedWorkflows);
    }

    // If we at least one workflow associated with at least one file then we can continue the upload
    private canContinue = (): boolean => {
        return this.props.workflowsWithAssociations.length > 0;
    }
}

export default AssociateWorkflows;
