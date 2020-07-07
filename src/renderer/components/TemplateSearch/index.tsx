import { Divider, Icon, Select } from "antd";
import * as classNames from "classnames";
import { sortBy } from "lodash";
import { ReactNode } from "react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import { LabkeyTemplate } from "../../services/labkey-client/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { requestTemplates } from "../../state/metadata/actions";
import { getTemplates } from "../../state/metadata/selectors";
import { openTemplateEditor } from "../../state/selection/actions";
import { AsyncRequest } from "../../state/types";

const styles = require("./styles.pcss");

interface TemplateSearchProps {
  allowCreate?: boolean;
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  onSelect: (selectedTemplateId: number) => void;
  value?: number;
}

export default function TemplateSearch(props: TemplateSearchProps) {
  const requestsInProgress = useSelector(getRequestsInProgress);
  const loading = requestsInProgress.includes(AsyncRequest.GET_TEMPLATES);
  const templates = useSelector(getTemplates);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(requestTemplates());
  }, [dispatch]);
  const [open, setOpen] = useState<boolean>(false);
  const [elClicked, setElClicked] = useState<EventTarget | undefined>(
    undefined
  );

  const {
    allowCreate,
    className,
    defaultOpen,
    disabled,
    onSelect,
    value,
  } = props;
  const sortedTemplates = sortBy(templates, ["Name", "Version"]);
  return (
    <Select
      autoFocus={true}
      className={classNames(styles.container, className)}
      defaultOpen={defaultOpen}
      disabled={disabled || (loading && !templates)}
      dropdownRender={(menu: ReactNode | undefined) => (
        <div>
          {menu}
          {allowCreate && (
            <>
              <Divider className={styles.divider} />
              <div
                className={styles.createTemplate}
                /* this is not onClick because of a bug here https://github.com/ant-design/ant-design/issues/16209
                 * I am hoping that we can change this to onClick after we upgrade antd to the latest version in FUA-6
                 * */
                onMouseDown={(e) =>
                  setElClicked(e.target === null ? undefined : e.target)
                }
                onMouseUp={(e) => {
                  if (elClicked === e.target) {
                    setOpen(false);
                    setElClicked(undefined);
                    dispatch(openTemplateEditor());
                  }
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
      onDropdownVisibleChange={(visible: boolean) => {
        if (!elClicked) {
          setOpen(visible);
        }
      }}
      onSelect={(templateId: number) => {
        onSelect(templateId);
        setOpen(false);
      }}
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
