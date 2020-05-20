import { Divider, Select } from "antd";
import * as classNames from "classnames";
import { sortBy } from "lodash";
import { ReactNode } from "react";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import IconText from "../../containers/TemplateEditorModal/IconText";
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

class TemplateSearch extends React.Component<TemplateSearchProps, {}> {
  public componentDidMount(): void {
    this.props.requestTemplates();
  }

  public render() {
    const {
      allowCreate,
      className,
      defaultOpen,
      loading,
      onSelect,
      templates,
      value,
    } = this.props;
    const sortedTemplates = sortBy(templates, ["Name", "Version"]);
    const options = sortedTemplates.map(
      ({ Name: name, TemplateId: id, Version: version }: LabkeyTemplate) => (
        <Select.Option key={`${name}${version}`} value={id}>
          {name} (Version {version})
        </Select.Option>
      )
    );
    if (allowCreate) {
      options.push(
        <Select.Option key="create" value={undefined}>
          <IconText icon="plus-circle" text="Create Template" />
        </Select.Option>
      );
    }
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
                <Divider style={{ margin: "4px 0" }} />
                <IconText
                  className={styles.iconText}
                  icon="plus-circle"
                  onClick={() => this.props.openTemplateEditor()}
                  text="Create Template"
                  textClassName={styles.createTemplateText}
                />
              </>
            )}
          </div>
        )}
        loading={loading && !templates}
        onSelect={onSelect}
        placeholder={`Select a ${SCHEMA_SYNONYM.toLowerCase()} name`}
        showSearch={true}
        value={value}
      >
        {sortedTemplates.map(
          ({
            Name: name,
            TemplateId: id,
            Version: version,
          }: LabkeyTemplate) => (
            <Select.Option key={`${name}${version}`} value={id}>
              {name} (Version {version})
            </Select.Option>
          )
        )}
      </Select>
    );
  }
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
