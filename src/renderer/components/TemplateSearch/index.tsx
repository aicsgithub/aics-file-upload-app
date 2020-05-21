import { Divider, Icon, Select } from "antd";
import * as classNames from "classnames";
import { sortBy } from "lodash";
import { ReactNode } from "react";
import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";
import { requestTemplates } from "../../state/metadata/actions";
import { getTemplates } from "../../state/metadata/selectors";
import { GetTemplatesAction } from "../../state/metadata/types";
import { openTemplateEditor } from "../../state/selection/actions";
import { State } from "../../state/types";

import { LabkeyTemplate } from "../../util/labkey-client/types";

const styles = require("./styles.pcss");

interface TemplateSearchProps {
  allowCreate?: boolean;
  className?: string;
  defaultOpen?: boolean;
  loading?: boolean;
  onSelect: (selectedTemplateId: number) => void;
  openTemplateEditor: typeof openTemplateEditor;
  requestTemplates: ActionCreator<GetTemplatesAction>;
  templates: LabkeyTemplate[];
  value?: number;
}

function TemplateSearch(props: TemplateSearchProps) {
  useEffect(() => {
    props.requestTemplates();
  }, []);
  const [open, setOpen] = useState<boolean>(false);

  const {
    allowCreate,
    className,
    defaultOpen,
    loading,
    onSelect,
    templates,
    value,
  } = props;
  const sortedTemplates = sortBy(templates, ["Name", "Version"]);
  return (
    <Select
      autoFocus={true}
      className={classNames(styles.container, className)}
      defaultOpen={defaultOpen}
      disabled={loading && !templates}
      dropdownRender={(menu: ReactNode | undefined) => (
        <div>
          {menu}
          {allowCreate && (
            <>
              <Divider style={styles.divider} />
              <div
                className={styles.createTemplate}
                /* this is not onClick because of a bug here https://github.com/ant-design/ant-design/issues/16209
                 * I am hoping that we can change this to onClick after we upgrade antd to the latest version in FUA-6
                 * */
                onMouseDown={() => {
                  setOpen(false);
                  props.openTemplateEditor();
                }}
              >
                <Icon className={styles.icon} type="plus-circle" />
                <span className={styles.text}>Create {SCHEMA_SYNONYM}</span>
              </div>
            </>
          )}
        </div>
      )}
      loading={loading && !templates}
      onDropdownVisibleChange={(visible: boolean) => setOpen(visible)}
      onSelect={onSelect}
      open={open}
      placeholder={`Select a ${SCHEMA_SYNONYM.toLowerCase()} name`}
      showSearch={true}
      value={value}
    >
      {sortedTemplates.map(
        ({ Name: name, TemplateId: id, Version: version }: LabkeyTemplate) => (
          <Select.Option key={`${name}${version}`} value={id}>
            {name} (Version {version})
          </Select.Option>
        )
      )}
    </Select>
  );
}

function mapStateToProps(state: State) {
  return {
    loading: getRequestsInProgressContains(state, AsyncRequest.GET_TEMPLATE),
    templates: getTemplates(state),
  };
}

const dispatchToPropsMap = {
  openTemplateEditor,
  requestTemplates,
};

export default connect(mapStateToProps, dispatchToPropsMap)(TemplateSearch);
