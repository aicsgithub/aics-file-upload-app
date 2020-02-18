import { Col, Select } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import TemplateSearch from "../../../components/TemplateSearch";
import { LabkeyUser } from "../../../util/labkey-client/types";

import SearchButton from "../SearchButton";

const styles = require("./styles.pcss");

interface UserAndTemplateFormProps {
    exportingCSV: boolean;
    searchLoading: boolean;
    onSearch: () => void;
    templateId?: number;
    user?: string;
    users: LabkeyUser[];
    selectUser: (user?: string) => void;
    selectTemplate: (templateId?: number) => void;
}

const UserAndTemplateForm: React.FunctionComponent<UserAndTemplateFormProps> = ({
                                                                                  exportingCSV,
                                                                                  onSearch,
                                                                                  searchLoading,
                                                                                  selectTemplate,
                                                                                  selectUser,
                                                                                  templateId,
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
                <TemplateSearch
                    onSelect={selectTemplate}
                    value={templateId}
                />
            </LabeledInput>
        </Col>
        <Col xs={6} xl={4} xxl={3}>
            <SearchButton
                disabled={!templateId || !user || searchLoading || exportingCSV}
                loading={searchLoading}
                onSearch={onSearch}
            />
        </Col>
    </>
);

export default UserAndTemplateForm;
