import * as React from "react";
import { connect, ConnectedProps } from "react-redux";

import AssociateWells from "../../components/AssociateWells";
import AssociateWorkflows from "../../components/AssociateWorkflows";
import { getWorkflowOptions } from "../../state/metadata/selectors";
import { goBack, goForward } from "../../state/route/actions";
import { selectWells, selectWorkflows } from "../../state/selection/actions";
import {
  getSelectedFiles,
  getSelectedWellLabels,
  getSelectedWells,
  getSelectedWellsWithData,
  getSelectedWorkflows,
  getWellsWithUnitsAndModified,
} from "../../state/selection/selectors";
import { getAssociateByWorkflow } from "../../state/setting/selectors";
import { State } from "../../state/types";
import {
  associateFilesAndWells,
  associateFilesAndWorkflows,
  jumpToUpload,
  undoFileWellAssociation,
  undoFileWorkflowAssociation,
} from "../../state/upload/actions";
import {
  getCanRedoUpload,
  getCanUndoUpload,
} from "../../state/upload/selectors";
import {
  getMutualFilesForWells,
  getMutualFilesForWorkflows,
  getWellsWithAssociations,
  getWorkflowsWithAssociations,
} from "./selectors";

function mapStateToProps(state: State) {
  return {
    associateWorkflows: getAssociateByWorkflow(state),
    canRedo: getCanRedoUpload(state),
    canUndo: getCanUndoUpload(state),
    mutualFilesForWells: getMutualFilesForWells(state),
    mutualFilesForWorkflows: getMutualFilesForWorkflows(state),
    selectedFiles: getSelectedFiles(state),
    selectedWellLabels: getSelectedWellLabels(state),
    selectedWells: getSelectedWells(state),
    selectedWellsData: getSelectedWellsWithData(state),
    selectedWorkflows: getSelectedWorkflows(state),
    wells: getWellsWithUnitsAndModified(state),
    wellsWithAssociations: getWellsWithAssociations(state),
    workflowOptions: getWorkflowOptions(state),
    workflowsWithAssociations: getWorkflowsWithAssociations(state),
  };
}

const dispatchToPropsMap = {
  associateFilesAndWells,
  associateFilesAndWorkflows,
  getWorkflowOptions,
  goBack,
  goForward,
  jumpToUpload,
  selectWells,
  selectWorkflows,
  undoFileWellAssociation,
  undoFileWorkflowAssociation,
};

const connector = connect(mapStateToProps, dispatchToPropsMap);

type AssociateFilesProps = ConnectedProps<typeof connector> & {
  className?: string;
};

class AssociateFiles extends React.Component<AssociateFilesProps, {}> {
  public render() {
    if (this.props.associateWorkflows) {
      return (
        <AssociateWorkflows
          associateFilesAndWorkflows={this.props.associateFilesAndWorkflows}
          canRedo={this.props.canRedo}
          canUndo={this.props.canUndo}
          className={this.props.className}
          mutualFiles={this.props.mutualFilesForWorkflows}
          goBack={this.props.goBack}
          goForward={this.props.goForward}
          redo={this.redo}
          selectWorkflows={this.props.selectWorkflows}
          selectedFiles={this.props.selectedFiles}
          selectedWorkflows={this.props.selectedWorkflows}
          workflowsWithAssociations={this.props.workflowsWithAssociations}
          undo={this.undo}
          undoAssociation={this.props.undoFileWorkflowAssociation}
          workflowOptions={this.props.workflowOptions}
        />
      );
    }
    return (
      <AssociateWells
        associateFilesAndWells={this.props.associateFilesAndWells}
        canRedo={this.props.canRedo}
        canUndo={this.props.canUndo}
        className={this.props.className}
        mutualFilesForWells={this.props.mutualFilesForWells}
        goBack={this.props.goBack}
        goForward={this.props.goForward}
        redo={this.redo}
        selectedFiles={this.props.selectedFiles}
        selectWells={this.props.selectWells}
        selectedWells={this.props.selectedWells}
        selectedWellLabels={this.props.selectedWellLabels}
        selectedWellsData={this.props.selectedWellsData}
        wellsWithAssociations={this.props.wellsWithAssociations}
        wells={this.props.wells}
        undo={this.undo}
        undoAssociation={this.props.undoFileWellAssociation}
      />
    );
  }

  private undo = (): void => {
    this.props.jumpToUpload(-1);
  };

  private redo = (): void => {
    this.props.jumpToUpload(1);
  };
}

export default connector(AssociateFiles);
