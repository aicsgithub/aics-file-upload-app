import { Alert, Input, Modal } from "antd";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import { includes, isEmpty, trim } from "lodash";
import { ChangeEvent, ReactNode } from "react";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_SAVE_UPLOAD_DRAFT } from "../../../shared/constants";
import { gatherUploadDraftNames } from "../../state/metadata/actions";
import { getUploadDraftNames } from "../../state/metadata/selectors";
import { GatherUploadDraftNamesAction } from "../../state/metadata/types";
import { closeModal, openModal } from "../../state/selection/actions";
import { getSaveUploadDraftModalVisible } from "../../state/selection/selectors";
import { CloseModalAction, OpenModalAction } from "../../state/selection/types";
import { State } from "../../state/types";
import { saveUploadDraft } from "../../state/upload/actions";
import { SaveUploadDraftAction } from "../../state/upload/types";

interface SaveUploadDraftModalProps {
    className?: string;
    closeModal: ActionCreator<CloseModalAction>;
    gatherUploadDraftNames: ActionCreator<GatherUploadDraftNamesAction>;
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
        this.props.gatherUploadDraftNames();
        ipcRenderer.on(OPEN_SAVE_UPLOAD_DRAFT, this.openModal);
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_SAVE_UPLOAD_DRAFT, this.openModal);
    }

    public render(): ReactNode {
        const {
            className,
            usedNames,
            visible,
        } = this.props;
        return (
            <Modal
                className={classNames(className)}
                okButtonProps={{
                    disabled: isEmpty(trim(this.state.name)),
                }}
                onCancel={this.closeModal}
                onOk={this.save}
                title="Save Draft As"
                visible={visible}
            >
                {this.state.name && includes(usedNames, this.state.name) && (
                    <Alert
                        type="warning"
                        message={`Warning: Found an existing draft named ${this.state.name}. Saving will overwrite.`}
                    />)
                }
                <Input value={this.state.name} onChange={this.updateName}/>
            </Modal>
        );
    }

    private openModal = () => this.props.openModal("saveUploadDraft");
    private closeModal = () => this.props.closeModal("saveUploadDraft");
    private updateName = (e: ChangeEvent<HTMLInputElement>) => this.setState({name: e.target.value});

    private save = () => {
        this.props.saveUploadDraft(this.state.name);
        this.closeModal();
    }
}

function mapStateToProps(state: State) {
    return {
        usedNames: getUploadDraftNames(state),
        visible: getSaveUploadDraftModalVisible(state),
    };
}

const dispatchToPropsMap = {
    closeModal,
    gatherUploadDraftNames,
    openModal,
    saveUploadDraft,
};

export default connect(mapStateToProps, dispatchToPropsMap)(SaveUploadDraftModal);
