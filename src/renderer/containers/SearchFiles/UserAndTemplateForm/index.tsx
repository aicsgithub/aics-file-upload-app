import { Col, Select } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import { LabkeyTemplate, LabkeyUser } from "../../../util/labkey-client/types";

import SearchButton from "../SearchButton";

const styles = require("./styles.pcss");

interface UserAndTemplateFormProps {
    exportingCSV: boolean;
    searchLoading: boolean;
    onSearch: () => void;
    template?: string;
    templates: LabkeyTemplate[];
    user?: string;
    users: LabkeyUser[];
    selectUser: (user?: string) => void;
    selectTemplate: (template?: string) => void;
}

const UserAndTemplateForm: React.FunctionComponent<UserAndTemplateFormProps> = ({
                                                                                  exportingCSV,
                                                                                  onSearch,
                                                                                  searchLoading,
                                                                                  selectTemplate,
                                                                                  selectUser,
                                                                                  template,
                                                                                  templates,
                                                                                  user,
                                                                                  users,
                                                                              }) => (
    <>
        <Col xs={6}>
            <LabeledInput label="User">
                <Select
                    showSearch={true}
                    value={user}
                    loading={!users.length}
                    disabled={!users.length}
                    onChange={selectUser}
                    placeholder="Select User"
                    className={styles.fullWidth}
                >
                    {users.map(({ DisplayName }) => (
                        <Select.Option key={DisplayName} value={DisplayName}>{DisplayName}</Select.Option>
                    ))}
                </Select>
            </LabeledInput>
        </Col>
        <Col xs={12} xl={14} xxl={15}>
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
                disabled={!template || !user || searchLoading || exportingCSV}
                loading={searchLoading}
                onSearch={onSearch}
            />
        </Col>
    </>
);

export default UserAndTemplateForm;
