import { Select } from "antd";
import * as React from "react";
import { SCHEMA_SYNONYM } from "../../../shared/constants";

import { LabkeyTemplate } from "../../util/labkey-client/types";

interface TemplateSearchProps {
    className?: string;
    onSelect: (selectedTemplateName: string) => void;
    templates: LabkeyTemplate[];
    value?: string;
}

class TemplateSearch extends React.Component<TemplateSearchProps, {}> {
    constructor(props: TemplateSearchProps) {
        super(props);
        this.state = {};
    }

    public render() {
        const {
            className,
            onSelect,
            templates,
            value,
        } = this.props;
        return (
          <Select
            className={className}
            onSelect={onSelect}
            placeholder={`Select a ${SCHEMA_SYNONYM.toLowerCase()} name`}
            value={value}
          >
              {templates.map(({Name: name}: LabkeyTemplate) => (
                  <Select.Option key={name} value={name}>{name}</Select.Option>
              ))}
          </Select>
        );
    }
}

export default TemplateSearch;
