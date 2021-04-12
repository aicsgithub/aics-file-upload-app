import { Alert, Input, List, Modal, Spin } from "antd";
import { trim } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  SCHEMA_SYNONYM,
} from "../../../shared/constants";
import FormControl from "../../components/FormControl";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { Annotation } from "../../services/labkey-client/types";
import { closeModal } from "../../state/feedback/actions";
import {
  getRequestsInProgress,
  getTemplateEditorVisible,
} from "../../state/feedback/selectors";
import {
  getAnnotationsWithAnnotationOptions,
  getAnnotationTypes,
  getForbiddenAnnotationNames,
  getLookups,
} from "../../state/metadata/selectors";
import { getShowTemplateHint } from "../../state/setting/selectors";
import {
  addExistingTemplate,
  saveTemplate,
} from "../../state/template/actions";
import AnnotationEditorModal from "./AnnotationEditorModal";

const styles = require("./styles.pcss");

const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

interface Props {
  className?: string;
};

export default function TemplateEditorModal(props: Props) {
  const dispatch = useDispatch();
  const lookups = useSelector(getLookups);
  const visible = useSelector(getTemplateEditorVisible);
  const annotationTypes = useSelector(getAnnotationTypes);
  const showTemplateHint = useSelector(getShowTemplateHint);
  const requestsInProgress = useSelector(getRequestsInProgress);
  const allAnnotations = useSelector(getAnnotationsWithAnnotationOptions);
  const forbiddenAnnotationNames = useSelector(getForbiddenAnnotationNames);

  const [name, setName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [annotations, setAnnotations] = React.useState<Annotation[]>([]);
  const [showAnnotationEditor, setShowAnnotationEditor] = React.useState(false);

  const templateId = undefined;
  const errors: string[] = [];

  React.useEffect(() => {
    // TODO: Request other data, set loading
    if (templateId) {
      setIsLoading(true);
      async function getTemplate() {
        setName("")
        setAnnotations([]);
      }
      getTemplate();
    }
  }, [templateId]);

  function onSave() {
    if (!errors.length) {
      dispatch(saveTemplate(name, annotations));
    } else if (!showErrors) {
      setShowErrors(true);
    }
  }

  function onCancel() {
    dispatch(closeModal("templateEditor"));
  }

  function onRenderAnnotationItem() {
    return (
      <div>hello</div>
    )
  }

  const isEditing = Boolean(templateId);
  const title = isEditing
    ? `Edit ${SCHEMA_SYNONYM}: ${name}`
    : `New ${SCHEMA_SYNONYM}`;
  return (
    <>
      <Modal
        width="90%"
        className={props.className}
        title={title}
        visible={visible}
        onOk={onSave}
        onCancel={onCancel}
        okText="Save"
        maskClosable={false}
        destroyOnClose={true} // Unmount child components
      >
        {isLoading ? (
          <div className={styles.spinContainer}>
            <div>Loading template...</div>
            <Spin />
          </div>
        ) : (
          <>
            {showErrors && (
              <Alert
                className={styles.errorAlert}
                showIcon={true}
                type="error"
                message={errors.map((e) => (
                  <div key={e}>{e}</div>
                ))}
              />
            )}
            {showTemplateHint && (
              <Alert
                className={styles.alert}
                closable={true}
                showIcon={true}
                type="info"
                message={COLUMN_TEMPLATE_DESCRIPTION}
              />
            )}
            <LabeledInput
              className={styles.selector}
              label="Copy Existing Template"
            >
              <TemplateSearch
                allowCreate={false}
                onSelect={(t) => dispatch(addExistingTemplate(t))}
              />
            </LabeledInput>
            {!isEditing && (
              <FormControl
                className={styles.formControl}
                label="Template Name"
                error={
                  showErrors && !trim(name)
                    ? "Template Name is required"
                    : undefined
                }
              >
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
            )}
            <div className={styles.listContainer}>
              <List
                className={styles.list}
                dataSource={annotations}
                header={<h4>Annotations</h4>}
                itemLayout="vertical"
                renderItem={onRenderAnnotationItem}
              />
            </div>
          </>
        )}
      </Modal>
      <AnnotationEditorModal
        visible={showAnnotationEditor}
        onSave={() => console.log("hey")}
        onCancel={() => setShowAnnotationEditor(false)}
      />
    </>
  );
}
