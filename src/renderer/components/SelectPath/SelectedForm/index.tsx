import { Button, Icon } from "antd";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    onCancel: () => void;
}

const SelectedForm: React.FunctionComponent<Props> = ({ onCancel }: Props) => {
    return (
        <>
            <Button onClick={onCancel} type="danger">Cancel</Button>
            <Icon className={styles.checkIcon} type="check" />
        </>
    );
};

export default SelectedForm;
