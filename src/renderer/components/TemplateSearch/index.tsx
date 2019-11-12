import { Select } from "antd";
import { sortBy } from "lodash";
import * as React from "react";

import { SCHEMA_SYNONYM } from "../../../shared/constants";

import { LabkeyTemplate } from "../../util/labkey-client/types";

interface TemplateSearchProps {
    className?: string;
    onSelect: (selectedTemplateId: number) => void;
    templates: LabkeyTemplate[];
    value?: number;
}

class TemplateSearch extends React.Component<TemplateSearchProps, {}> {
    public render() {
        const {
            className,
            onSelect,
            templates,
            value,
        } = this.props;
        const sortedTemplates = sortBy(templates, ["Name", "Version"]);
        return (
          <Select
            className={className}
            onSelect={onSelect}
            placeholder={`Select a ${SCHEMA_SYNONYM.toLowerCase()} name`}
            showSearch={true}
            value={value}
          >
              {sortedTemplates.map(({Name: name, TemplateId: id, Version: version}: LabkeyTemplate) => (
                  <Select.Option key={`${name}${version}`} value={id}>{name} (Version {version})</Select.Option>
              ))}
          </Select>
        );
    }
}

export default TemplateSearch;