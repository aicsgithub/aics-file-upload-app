import { Button, Card, Tabs } from "antd";
import * as React from "react";

import FileAssociations from "./FileAssociations/index";

const styles = require("./style.pcss");

interface SelectedAssociationsProps {
    children: React.ReactNode | React.ReactNodeArray;
    className?: string;
    selectedFilesCount: number;
    files: string[];
    associate: () => void;
    undoAssociation: (file: string) => void;
    undoLastAssociation: () => void;
    redo: () => void;
    canAssociate: boolean;
    canUndoLastAssociation: boolean;
    canRedo: boolean;
    title: string;
}

class SelectedAssociationsCard extends React.Component<SelectedAssociationsProps, {}> {
    public render() {
        const {
            associate,
            canAssociate,
            canRedo,
            canUndoLastAssociation,
            children,
            className,
            files,
            redo,
            selectedFilesCount,
            title,
            undoAssociation,
            undoLastAssociation,
        } = this.props;

        const titleBar = (
            <div className={styles.titleRow}>
                <div className={styles.title}>{title}</div>

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
                    {children}
                </Tabs>
            </Card>
        );
    }
}

export default SelectedAssociationsCard;
