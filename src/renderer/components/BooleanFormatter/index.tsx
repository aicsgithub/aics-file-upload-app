import * as classNames from "classnames";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
  value: boolean[]; // will always be an array of length 0 or 1
}

const BooleanFormatter: React.FunctionComponent<Props> = ({
  className,
  value,
}: Props) => {
  return (
    <input
      readOnly={true}
      className={classNames(
        styles.boolean,
        value[0] ? styles.true : styles.false,
        className
      )}
      value={value[0] ? "Yes" : "No"}
    />
  );
};

export default BooleanFormatter;
