import { AicsGridCell } from "@aics/aics-react-labkey";
import { Icon, Modal } from "antd";
import * as classNames from "classnames";
import { flatten, isNil } from "lodash";
import * as React from "react";
import { Well } from "../../../state/selection/types";
import Plate from "../../Plate";

const styles = require("./styles.pcss");

interface Props {
    className?: string;
    fileName: string;
    positionIndex?: number;
    saveWells: (wells: Well[]) => void;
    selectedWellLabels?: string;
    selectedWellIds: number[];
    wells: Well[][];
}

interface WellsFormatterState {
    selectedWells: AicsGridCell[];
    showModal: boolean;
}

class WellsFormatter extends React.Component<Props, WellsFormatterState> {

    constructor(props: Props) {
        super(props);
        this.state = {
            ...this.getStateFromProps(props),
            showModal: false,
        };
    }

    public componentDidUpdate(prevProps: Props, prevState: WellsFormatterState) {
        if (prevState.showModal !== this.state.showModal && this.state.showModal) {
            this.setState({ ...this.getStateFromProps(prevProps)});
        }
    }

    public render() {
        const {
            className,
            fileName,
            positionIndex,
            selectedWellIds,
            selectedWellLabels,
            wells,
        } = this.props;
        const {
            selectedWells,
            showModal,
        } = this.state;

        let title = `Associate Wells with \"${fileName}\"`;
        if (!isNil(positionIndex)) {
            title += `, position ${positionIndex}`;
        }

        return (
            <>
                <div className={classNames(styles.container, className)}>
                    <div className={styles.labels}>{selectedWellLabels}</div>
                    <Icon className={styles.editWellsIcon} onClick={this.openModal} type="edit"/>
                </div>
                <Modal
                    width="90%"
                    title={title}
                    visible={showModal}
                    onOk={this.saveWells}
                    onCancel={this.closeModal}
                    okButtonProps={{disabled: selectedWells.length === 0}}
                >
                    <Plate
                        wells={wells}
                        onWellClick={this.selectWells}
                        selectedWells={selectedWells}
                        wellsWithAssociations={selectedWellIds}
                    />
                </Modal>
            </>
        );
    }

    private openModal = () => this.setState({showModal: true});

    private closeModal = () => this.setState({showModal: false});

    private saveWells = () => {
        const flattenedWells: Well[] = flatten(this.props.wells);
        this.props.saveWells(
            this.state.selectedWells
                .map(({col, row}: AicsGridCell) => {
                    return flattenedWells.find((w: Well) => w.col === col && w.row === row);
                }).filter((w) => !!w) as Well[]
        );
        this.closeModal();
    }

    private selectWells = (cells: AicsGridCell[]) => {
        const { wells } = this.props;
        const filledCells = cells.filter((cell) => wells[cell.row][cell.col].modified);
        this.setState({selectedWells: filledCells});
    }

    private getStateFromProps = (props: Props) => {
        const flattenedWells: Well[] = flatten(props.wells);
        const selectedWells = props.selectedWellIds.map((selectedWellId: number) => {
            return flattenedWells.find((w: Well) => w.wellId === selectedWellId);
        }).filter((w) => !!w) as Well[];
        return {
            selectedWells,
        };
    }
}

export default WellsFormatter;
