import { Alert, Input, Modal } from "antd";
import { includes, isEmpty, trim } from "lodash";
import { ChangeEvent, ReactNode } from "react";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { closeModal, openModal } from "../../state/feedback/actions";
import { getSaveUploadDraftModalVisible } from "../../state/feedback/selectors";
import { CloseModalAction, OpenModalAction } from "../../state/feedback/types";
import { gatherUploadDrafts } from "../../state/metadata/actions";
import { getUploadDraftNames } from "../../state/metadata/selectors";
import { GatherUploadDraftsAction } from "../../state/metadata/types";
import { State } from "../../state/types";
import { saveUploadDraft } from "../../state/upload/actions";
import { getCanSaveUploadDraft } from "../../state/upload/selectors";
import { SaveUploadDraftAction } from "../../state/upload/types";

const styles = require("./style.pcss");

interface SaveUploadDraftModalProps {
    canSaveUploadDraft: boolean;
    className?: string;
    closeModal: ActionCreator<CloseModalAction>;
    gatherUploadDrafts: ActionCreator<GatherUploadDraftsAction>;
    key: boolean;
    openModal: ActionCreator<OpenModalAction>;
    saveUploadDraft: ActionCreator<SaveUploadDraftAction>;
    usedNames: string[];
    visible: boolean;
}

interface SaveUploadDraftModalState {
    name?: string;
}

class SaveUploadDraftModal extends React.Component<SaveUploadDraftModalProps, SaveUploadDraftModalState> {
    public constructor(props: SaveUploadDraftModalProps) {
        super(props);
        this.state = {
            name: undefined,
        };
    }

    public componentDidMount(): void {
        this.props.gatherUploadDrafts();
    }

    public render(): ReactNode {
        const {
            canSaveUploadDraft,
            className,
            usedNames,
            visible,
        } = this.props;
        return (
            <Modal
                className={className}
                okButtonProps={{
                    disabled: isEmpty(trim(this.state.name)) || !canSaveUploadDraft,
                }}
                onCancel={this.closeModal}
                onOk={this.save}
                title="Save Draft As"
                visible={visible}
            >
                {this.state.name && includes(usedNames, this.state.name) && (
                    <Alert
                        className={styles.alert}
                        type="warning"
                        message={`Warning: Found an existing draft named ${this.state.name}.`}
                        showIcon={true}
                    />
                )}
                {!canSaveUploadDraft && (
                    <Alert
                        className={styles.alert}
                        type="error"
                        message="Nothing to save!"
                        showIcon={true}
                    />
                )}
                {canSaveUploadDraft && <Input value={this.state.name} onChange={this.updateName} autoFocus={true}/>}
            </Modal>
        );
    }

    private closeModal = () => this.props.closeModal("saveUploadDraft");
    private updateName = (e: ChangeEvent<HTMLInputElement>) => this.setState({name: e.target.value});

    private save = () => {
        this.props.saveUploadDraft(this.state.name);
        this.closeModal();
    }
}

function mapStateToProps(state: State) {
    return {
        canSaveUploadDraft: getCanSaveUploadDraft(state),
        key: getSaveUploadDraftModalVisible(state),
        usedNames: getUploadDraftNames(state),
        visible: getSaveUploadDraftModalVisible(state),
    };
}

const dispatchToPropsMap = {
    closeModal,
    gatherUploadDrafts,
    openModal,
    saveUploadDraft,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SaveUploadDraftModal);
