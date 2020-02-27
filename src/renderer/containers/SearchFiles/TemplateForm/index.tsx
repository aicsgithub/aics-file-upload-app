import { Col } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import TemplateSearch from "../../../components/TemplateSearch";

import SearchButton from "../SearchButton";

interface TemplateFormProps {
    exportingCSV: boolean;
    searchLoading: boolean;
    onSearch: () => void;
    templateId?: number;
    selectTemplate: (templateId?: number) => void;
}

const TemplateForm: React.FunctionComponent<TemplateFormProps> = ({
                                                                      exportingCSV,
                                                                      onSearch,
                                                                      searchLoading,
                                                                      selectTemplate,
                                                                      templateId,
                                                                  }) => (
    <>
        <Col xs={18} xl={20} xxl={21}>
            <LabeledInput label="Template">
                <TemplateSearch defaultOpen={true} onSelect={selectTemplate} value={templateId}/>
            </LabeledInput>
        </Col>
        <Col xs={6} xl={4} xxl={3}>
            <SearchButton
                disabled={!templateId || searchLoading || exportingCSV}
                loading={searchLoading}
                onSearch={onSearch}
            />
        </Col>
    </>
);

export default TemplateForm;
