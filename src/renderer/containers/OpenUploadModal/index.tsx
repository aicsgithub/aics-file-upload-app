import { Modal, Table } from "antd";
import { RowSelectionType } from "antd/lib/table";
import * as classNames from "classnames";
import { ipcRenderer } from "electron";
import * as moment from "moment";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { OPEN_OPEN_UPLOAD_MODAL } from "../../../shared/constants";

import { LONG_DATETIME_FORMAT } from "../../constants";
import { closeModal, openModal } from "../../state/feedback/actions";
import { getOpenUploadModalVisible } from "../../state/feedback/selectors";
import { CloseModalAction, OpenModalAction } from "../../state/feedback/types";
import { gatherUploadDrafts } from "../../state/metadata/actions";
import { getUploadDraftInfo } from "../../state/metadata/selectors";
import { CurrentUpload, GatherUploadDraftsAction } from "../../state/metadata/types";
import { State } from "../../state/types";
import { openUploadDraft } from "../../state/upload/actions";
import { getUploadDraftKey } from "../../state/upload/constants";
import { OpenUploadDraftAction } from "../../state/upload/types";

const styles = require("./style.pcss");

const columns = [
    {
        dataIndex: "name",
        ellipsis: true,
        title: "Name",
        width: 300,
    },
    {
        dataIndex: "modified",
        ellipsis: true,
        title: "Modified",
        width: 120,
    },
    {
        dataIndex: "created",
        ellipsis: true,
        title: "Created",
        width: 120,
    },
];

interface DraftRow {
    created: string;
    modified: string;
    name: string;
}

interface Props {
    className?: string;
    closeModal: ActionCreator<CloseModalAction>;
    drafts: CurrentUpload[];
    gatherUploadDrafts: ActionCreator<GatherUploadDraftsAction>;
    openModal: ActionCreator<OpenModalAction>;
    openUploadDraft: ActionCreator<OpenUploadDraftAction>;
    visible: boolean;
}

interface OpenUploadState {
    selectedDraft?: DraftRow;
}

class OpenUploadModal extends React.Component<Props, OpenUploadState> {
    constructor(props: Props) {
        super(props);
        this.state = {
            selectedDraft: undefined,
        };
    }

    public componentDidMount(): void {
        this.props.gatherUploadDrafts();
        ipcRenderer.on(OPEN_OPEN_UPLOAD_MODAL, this.openModal);
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.visible !== this.props.visible) {
            this.props.gatherUploadDrafts();
            this.setState({
                selectedDraft: undefined,
            });
        }
    }

    public componentWillUnmount(): void {
        ipcRenderer.removeListener(OPEN_OPEN_UPLOAD_MODAL, this.openModal);
    }

    public render() {
        const { className, drafts, visible } = this.props;
        const { selectedDraft } = this.state;
        const formattedDrafts = drafts.map(this.draftRowToCurrentUpload);
        const rowSelectionType: RowSelectionType = "radio";
        return (
            <Modal
                bodyStyle={{height: "350px"}}
                className={classNames(styles.container, className)}
                okButtonProps={{
                    disabled: !this.state.selectedDraft,
                }}
                onCancel={this.closeModal}
                onOk={this.openDraft}
                title="Open Upload Draft"
                visible={visible}
                width="90%"
            >
                <Table
                    bordered={false}
                    columns={columns}
                    dataSource={formattedDrafts}
                    pagination={false}
                    rowKey={this.getRowKey}
                    rowSelection={{
                        onSelect: this.selectDraft,
                        selectedRowKeys: selectedDraft ?
                            [this.getRowKey(selectedDraft)] : [],
                        type: rowSelectionType,
                    }}
                    size="small"
                />
            </Modal>
        );
    }

    private getRowKey = (record: DraftRow) => record.name + record.created;
    private draftRowToCurrentUpload = (draft: CurrentUpload): DraftRow => ({
        ...draft,
        created: moment(draft.created).format(LONG_DATETIME_FORMAT),
        modified: moment(draft.modified).format(LONG_DATETIME_FORMAT),
    })

    private selectDraft = (selectedDraft: DraftRow) => this.setState({ selectedDraft });

    private openDraft = () => {
        if (this.state.selectedDraft) {
            const {created, name} = this.state.selectedDraft;
            this.props.openUploadDraft(getUploadDraftKey(name, moment(created, LONG_DATETIME_FORMAT).toDate()));
        }
    }

    private openModal = () => this.props.openModal("openUpload");
    private closeModal = () => this.props.closeModal("openUpload");
}

function mapStateToProps(state: State) {
    return {
        drafts: getUploadDraftInfo(state),
        visible: getOpenUploadModalVisible(state),
    };
}

const dispatchToPropsMap = {
    closeModal,
    gatherUploadDrafts,
    openModal,
    openUploadDraft,
};

export default connect(mapStateToProps, dispatchToPropsMap)(OpenUploadModal);
