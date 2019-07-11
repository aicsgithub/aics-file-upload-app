import { Divider } from "antd";
import * as React from "react";

import { Solution } from "../../../../state/selection/types";

import { NULL_TEXT } from "../index";
import KeyValueDisplay from "../KeyValueDisplay";

const styles = require("../style.pcss");

export interface SolutionsProps {
    className?: string;
    solutions: Solution[];
}

const Solutions: React.FunctionComponent<SolutionsProps> = (props) => {
    const {
        className,
        solutions,
    } = props;

    return (
        <div className={className}>
            {solutions.map(({solutionLot, volume, volumeUnitDisplay}: Solution, i) => {
                const {
                    concentration,
                    concentrationUnitsDisplay,
                    dilutionFactorPart,
                    dilutionFactorTotal,
                    solutionName,
                } = solutionLot;

                let concentrationLine: JSX.Element | undefined;
                // Due to a DB constraint, concentration and its units always both have values, or are both null
                if (concentration && concentrationUnitsDisplay) {
                    const concentrationDisplay = `${concentration} ${concentrationUnitsDisplay}`;
                    concentrationLine = (
                        <KeyValueDisplay keyName="Concentration" value={concentrationDisplay}/>
                    );
                // Due to a DB constraint, dilution factor part and total always both have values, or are both null
                } else if (dilutionFactorPart && dilutionFactorTotal) {
                    concentrationLine = (
                        <KeyValueDisplay
                            keyName="Dilution Factor"
                            value={`${dilutionFactorPart}:${dilutionFactorTotal}`}
                        />
                    );
                }

                return (
                    <React.Fragment key={i}>
                        <Divider dashed={true} className={styles.subDivider}>Solution {i + 1}</Divider>
                        <div className={styles.group}>
                            <KeyValueDisplay keyName="Solution" value={solutionName || NULL_TEXT}/>
                            {concentrationLine}
                            <KeyValueDisplay keyName="Volume" value={`${volume || NULL_TEXT} ${volumeUnitDisplay}`}/>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Solutions;
