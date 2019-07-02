import { Divider } from "antd";
import * as React from "react";

import { CellPopulation } from "../../../../state/selection/types";

import { NULL_TEXT } from "..";
import KeyValueDisplay from "../KeyValueDisplay";

const styles = require("../style.pcss");

export interface CellPopulationsProps {
    className?: string;
    cellPopulations: CellPopulation[];
}

const CellPopulations: React.FunctionComponent<CellPopulationsProps> = (props) => {
    const {
        className,
        cellPopulations,
    } = props;

    return (
        <div className={className}>
            {
                cellPopulations.map((entry: CellPopulation, i) => {
                    const {
                        sourcePlateWell,
                        sourceVial,
                        wellCellPopulation,
                    } = entry;
                    let populationText: JSX.Element | undefined;
                    if (wellCellPopulation) {
                        // Show Source Plate Well or Vial info if available
                        let sourceText: JSX.Element | null = null;
                        if (sourcePlateWell && sourcePlateWell.plateBarcode && sourcePlateWell.wellLabel) {
                            sourceText = (
                                <React.Fragment>
                                    <KeyValueDisplay keyName="Source Plate" value={sourcePlateWell.plateBarcode}/>
                                    <KeyValueDisplay keyName="Well" value={sourcePlateWell.wellLabel}/>
                                </React.Fragment>
                            );
                        } else if (sourceVial) {
                            sourceText = (
                                <React.Fragment>
                                    <KeyValueDisplay keyName="Source Vial" value={sourceVial.barcode}/>
                                </React.Fragment>
                            );
                        }

                        populationText = (
                            <React.Fragment>
                                {sourceText}
                                {wellCellPopulation.cellLineName &&
                                <KeyValueDisplay keyName="Cell Line" value={wellCellPopulation.cellLineName}/>}
                                <KeyValueDisplay keyName="Clone" value={wellCellPopulation.clone || NULL_TEXT}/>
                                <KeyValueDisplay keyName="Passage" value={wellCellPopulation.passage || NULL_TEXT}/>
                            </React.Fragment>
                        );
                    }
                    return (
                        <React.Fragment key={i}>
                            <Divider dashed={true} className={styles.subDivider}>Cell Population {i + 1}</Divider>
                            <div className={styles.group}>
                                {populationText}
                                <KeyValueDisplay keyName="Seeding Density" value={entry.seedingDensity || NULL_TEXT}/>
                            </div>
                        </React.Fragment>
                    );
                })
            }
        </div>
    );
};

export default CellPopulations;
