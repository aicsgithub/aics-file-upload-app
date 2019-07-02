import { Button, Card, Tabs } from "antd";
import * as React from "react";

import { Well } from "../../state/selection/types";
import { getWellLabel } from "../../util";
import WellFileAssociations from "./WellFileAssociations/index";
import WellInfo from "./WellInfo/index";

const styles = require("./style.pcss");

interface WellInfoProps {
    className?: string;
    selectedFilesCount: number;
    selectedWells: Well[];
    wellLabels: string[];
    files: string[];
    associate: () => void;
    undoAssociation: (file: string) => void;
    undoLastAssociation: () => void;
    redo: () => void;
    canAssociate: boolean;
    canUndoLastAssociation: boolean;
    canRedo: boolean;
}

class SelectedWellsCard extends React.Component<WellInfoProps, {}> {
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
            selectedWells,
            wellLabels,
        } = this.props;

        const title = (
            <div className={styles.titleRow}>
                <div className={styles.title}>Selected Well(s): {wellLabels.sort().join(", ")}</div>

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
            <Card className={className} title={title}>
                <Tabs type="card">
                    <Tabs.TabPane tab="Associated Files" key="associations">
                        <WellFileAssociations
                            className={styles.tabPane}
                            associate={associate}
                            canAssociate={canAssociate}
                            files={files}
                            selectedFilesCount={selectedFilesCount}
                            undoAssociation={undoAssociation}
                        />
                    </Tabs.TabPane>
                    {selectedWells.map((well) => (
                        <Tabs.TabPane key={getWellLabel(well)} tab={getWellLabel(well)} className={styles.tabPane}>
                            <WellInfo className={styles.tabPane} well={well}/>
                        </Tabs.TabPane>
                    ))}
                </Tabs>
            </Card>
        );
    }
}

export default SelectedWellsCard;
