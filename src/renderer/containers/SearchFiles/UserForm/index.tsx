import { Col, Select } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import { LabkeyUser } from "../../../util/labkey-client/types";
import SearchButton from "../SearchButton";

const styles = require("./styles.pcss");

interface UserFormProps {
  exportingCSV: boolean;
  searchLoading: boolean;
  onSearch: () => void;
  user?: string;
  users: LabkeyUser[];
  selectUser: (user?: string) => void;
}

const UserForm: React.FunctionComponent<UserFormProps> = ({
  exportingCSV,
  onSearch,
  searchLoading,
  selectUser,
  user,
  users,
}) => (
  <>
    <Col xs={18} xl={20} xxl={21}>
      <LabeledInput label="User">
        <Select
          defaultOpen={true}
          showSearch={true}
          value={user}
          loading={!users.length}
          disabled={!users.length}
          onChange={selectUser}
          placeholder="Select User"
          className={styles.fullWidth}
        >
          {users.map(({ DisplayName }) => (
            <Select.Option key={DisplayName} value={DisplayName}>
              {DisplayName}
            </Select.Option>
          ))}
        </Select>
      </LabeledInput>
    </Col>
    <Col xs={6} xl={4} xxl={3}>
      <SearchButton
        disabled={!user || searchLoading || exportingCSV}
        loading={searchLoading}
        onSearch={onSearch}
      />
    </Col>
  </>
);

export default UserForm;
