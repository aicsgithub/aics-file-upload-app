import { Divider, Empty } from "antd";
import * as classNames from "classnames";
import { isEmpty } from "lodash";
import * as React from "react";

import { Well } from "../../../state/selection/types";

import CellPopulations from "./CellPopulations";
import Solutions from "./Solutions";

const styles = require("./style.pcss");
export const NULL_TEXT = "None";

interface WellInfoProps {
    className?: string;
    well?: Well;
}

class WellInfo extends React.Component<WellInfoProps, []> {
    constructor(props: WellInfoProps) {
        super(props);
    }

    public render() {
        const {
            className,
            well,
        } = this.props;

        if (!well) {
            return (
                <div className={classNames(styles.container, styles.empty, className)}>
                    <Empty/>
                </div>
            );
        }

        const { cellPopulations, solutions } = well;

        return (
            <div className={classNames(styles.container, className)}>
                <CellPopulations cellPopulations={cellPopulations}/>
                {!isEmpty(solutions) && <Divider />}
                <Solutions solutions={solutions}/>
            </div>
        );
    }
}

export default WellInfo;
