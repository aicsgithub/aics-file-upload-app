import { Input } from "antd";
import { InputProps } from "antd/lib/input/Input";
import { omit } from "lodash";
import * as React from "react";

const styles = require("./styles.pcss");

interface LabeledInputProps extends InputProps {
    className?: string;
    label: string;
}

const LabeledInput: React.FunctionComponent<LabeledInputProps> = (props: LabeledInputProps) => {
    const { className, required } = props;
    const inputProps = omit(props, ["className", "label"]);
    return (
        <div className={className}>
            <div>Column Name&nbsp;{required && <span className={styles.star}>*</span>}</div>
            <Input {...inputProps} />
        </div>
    );
};

export default LabeledInput;
