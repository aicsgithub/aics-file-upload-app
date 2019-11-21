import { Button } from "antd";
import * as React from "react";

interface Props {
    onCancel: () => void;
}

const SelectedForm: React.FunctionComponent<Props> = ({ onCancel }: Props) => {
    return <Button onClick={onCancel} type="danger">Cancel</Button>;
};

export default SelectedForm;
