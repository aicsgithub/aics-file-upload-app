import { Button, Card } from "antd";
import classNames from "classnames";
import * as React from "react";
import SelectedForm from "../SelectedForm";

const styles = require("./styles.pcss");

interface Props {
  isSelected: boolean;
  onCancel: () => void;
  selectWorkflowPath: () => void;
}

/*
    This card is for selecting to associate files with workflows rather than a plate.
 */
const SelectWorkflowCard: React.FunctionComponent<Props> = ({
  isSelected,
  onCancel,
  selectWorkflowPath,
}: Props) => {
  return (
    <Card
      hoverable={true}
      title="Select Workflow"
      className={classNames(styles.card, isSelected && styles.selectedCard)}
    >
      <p>
        This option is in case you do not have a plate nor enough data to create
        one. In this case you will associate your files with workflows.
      </p>
      {isSelected ? (
        <SelectedForm onCancel={onCancel} />
      ) : (
        <Button onClick={selectWorkflowPath}>Select</Button>
      )}
    </Card>
  );
};

export default SelectWorkflowCard;
