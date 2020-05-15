import * as classNames from "classnames";
import { first } from "lodash";
import * as React from "react";

import { CellPopulation, Well } from "../../state/selection/types";

const styles = require("./style.pcss");

interface WellProps {
  className?: string;
  well: Well;
}

class WellComponent extends React.Component<WellProps, {}> {
  constructor(props: WellProps) {
    super(props);
    this.getWellText = this.getWellText.bind(this);
  }

  public render() {
    const { className } = this.props;

    return (
      <div className={classNames(styles.container, className)}>
        {this.getWellText()}
      </div>
    );
  }

  private getWellText() {
    const { well } = this.props;

    const cellPopulation: CellPopulation | undefined = first(
      well.cellPopulations
    );

    if (cellPopulation) {
      const { wellCellPopulation } = cellPopulation;
      if (wellCellPopulation) {
        return (
          <React.Fragment>
            <div className={styles.wellText}>
              {wellCellPopulation.cellLineName}
            </div>
            <div className={styles.wellText}>{`C${
              wellCellPopulation.clone || "_N/A"
            }`}</div>
            <div className={styles.wellText}>{`P${
              wellCellPopulation.passage || "_N/A"
            }`}</div>
          </React.Fragment>
        );
      }
    }

    return null;
  }
}

export default WellComponent;
