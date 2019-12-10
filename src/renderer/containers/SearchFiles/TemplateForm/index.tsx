import { Col, Select } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import { LabkeyTemplate } from "../../../util/labkey-client/types";

import SearchButton from "../SearchButton";

const styles = require("./styles.pcss");

interface TemplateFormProps {
    exportingCSV: boolean;
    searchLoading: boolean;
    onSearch: () => void;
    template?: string;
    templates: LabkeyTemplate[];
    selectTemplate: (template?: string) => void;
}

const TemplateForm: React.FunctionComponent<TemplateFormProps> = ({
                                                                      exportingCSV,
                                                                      onSearch,
                                                                      searchLoading,
                                                                      selectTemplate,
                                                                      template,
                                                                      templates,
                                                                  }) => (
    <>
        <Col xs={18} xl={20} xxl={21}>
            <LabeledInput label="Template">
                <Select
                    allowClear={true}
                    showSearch={true}
                    value={template}
                    loading={!templates.length}
                    disabled={!templates.length}
                    onChange={selectTemplate}
                    placeholder="Select Template"
                    className={styles.fullWidth}
                >
                    {templates.map(({ Name }) => (
                        <Select.Option key={Name} value={Name}>{Name}</Select.Option>
                    ))}
                </Select>
            </LabeledInput>
        </Col>
        <Col xs={6} xl={4} xxl={3}>
            <SearchButton
                disabled={!template || searchLoading || exportingCSV}
                loading={searchLoading}
                onSearch={onSearch}
            />
        </Col>
    </>
);

export default TemplateForm;
