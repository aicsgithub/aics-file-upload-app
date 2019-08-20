import { Button, Card, Tabs } from "antd";
import * as React from "react";

import { Well, Workflow } from "../../state/selection/types";
import FileAssociations from "./FileAssociations/index";
import KeyValueDisplay from "./KeyValueDisplay";
import WellInfo from "./WellInfo/index";

const styles = require("./style.pcss");

interface SelectedAssociationsProps {
    className?: string;
    selectedFilesCount: number;
    selectedWellLabels?: string[];
    selectedWells?: Well[];
    selectedWorkflows?: Workflow[];
    wellLabels?: string[];
    files: string[];
    associate: () => void;
    undoAssociation: (file: string) => void;
    undoLastAssociation: () => void;
    redo: () => void;
    canAssociate: boolean;
    canUndoLastAssociation: boolean;
    canRedo: boolean;
    useWells?: boolean;
}

class SelectedAssociationsCard extends React.Component<SelectedAssociationsProps, {}> {
    public render() {
        const {
            associate,
            canAssociate,
            canRedo,
            canUndoLastAssociation,
            className,
            files,
            redo,
            selectedFilesCount,
            undoAssociation,
            undoLastAssociation,
            selectedWellLabels,
            selectedWells,
            selectedWorkflows,
            wellLabels,
        } = this.props;

        let title;
        if (this.props.useWells) {
            title = (
                <div className={styles.title}>Selected Well(s): {wellLabels ? wellLabels.sort().join(", ") : []}
                </div>);
        } else {
            title = (
                <div className={styles.title}>
                    Selected Workflow(s):
                    {selectedWorkflows ?
                        selectedWorkflows.map((workflow: Workflow) => workflow.name).sort().join(", ")
                        :
                        []
                    }
                </div>);
        }

        const titleBar = (
            <div className={styles.titleRow}>
                {title}

                <div className={styles.titleButtons}>
                    <Button
                        onClick={undoLastAssociation}
                        disabled={!canUndoLastAssociation}
                    >
                        Undo
                    </Button>
                    <Button
                        onClick={redo}
                        disabled={!canRedo}
                    >
                        Redo
                    </Button>
                </div>
            </div>
        );
        return (
            <Card className={className} title={titleBar}>
                <Tabs type="card">
                    <Tabs.TabPane tab="Associated Files" key="associations">
                        <FileAssociations
                            className={styles.tabPane}
                            associate={associate}
                            canAssociate={canAssociate}
                            files={files}
                            selectedFilesCount={selectedFilesCount}
                            undoAssociation={undoAssociation}
                        />
                    </Tabs.TabPane>
                    {selectedWells && selectedWells.map((well, i) => (
                        <Tabs.TabPane
                            className={styles.tabPane}
                            key={selectedWellLabels && selectedWellLabels[i]}
                            tab={selectedWellLabels && selectedWellLabels[i]}
                        >
                            <WellInfo className={styles.tabPane} well={well}/>
                        </Tabs.TabPane>
                    ))}
                    {selectedWorkflows && selectedWorkflows.map(({ description,
                                                                   name,
                                                                   workflowId }: Workflow) => (
                        <Tabs.TabPane
                            className={styles.tabPane}
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
                </Tabs>
            </Card>
        );
    }
}

export default SelectedAssociationsCard;
