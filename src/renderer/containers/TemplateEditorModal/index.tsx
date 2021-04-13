import { Alert, Button, Checkbox, Input, Modal, Popover, Spin, Table, Tooltip } from "antd";
import { ipcRenderer } from "electron";
import { trim } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  OPEN_TEMPLATE_MENU_ITEM_CLICKED,
  SCHEMA_SYNONYM,
} from "../../../shared/constants";
import FormControl from "../../components/FormControl";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { closeModal, openModal } from "../../state/feedback/actions";
import {
  getTemplateEditorVisible,
} from "../../state/feedback/selectors";
import { requestAnnotations } from "../../state/metadata/actions";
import {
  getAnnotationsWithAnnotationOptions,
} from "../../state/metadata/selectors";
import { getShowTemplateHint } from "../../state/setting/selectors";
import {
  addExistingTemplate,
  saveTemplate,
} from "../../state/template/actions";
import { AnnotationWithOptions } from "../../state/template/types";
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
  const visible = useSelector(getTemplateEditorVisible);
  const showTemplateHint = useSelector(getShowTemplateHint);
  const allAnnotations = useSelector(getAnnotationsWithAnnotationOptions);

  const [name, setName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [annotations, setAnnotations] = React.useState<AnnotationWithOptions[]>([]);
  const [showAnnotationEditor, setShowAnnotationEditor] = React.useState<Partial<AnnotationWithOptions>>();
  const [focusedAnnotation, setFocusedAnnotation] = React.useState<AnnotationWithOptions>();

  const templateId = undefined;
  const errors: string[] = [];

  // TODO: Get around this..?
  React.useEffect(() => {
    function showModal() {
      dispatch(requestAnnotations());
      dispatch(openModal("templateEditor"));
    }
    ipcRenderer.on(OPEN_TEMPLATE_MENU_ITEM_CLICKED, showModal);
    return () => {
      ipcRenderer.removeListener(OPEN_TEMPLATE_MENU_ITEM_CLICKED, showModal);
    }
  }, [dispatch])

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



const columns = [
  {
    dataIndex: "displayName",
    ellipsis: true,
    key: "displayName",
    title: "Name",
    width: "100%",
    render: (name: string, row: AnnotationWithOptions) => (
      <Tooltip overlay={row.description}>
        {name}
      </Tooltip>
    ),
  },
  {
    align: "center",
    dataIndex: "required",
    key: "required",
    render: (required: boolean) => <Checkbox checked={required} onChange={() => console.log("hey")} />,
    title: "Required",
    width: "130px",
  },
  {
    align: "right",
    key: "actions",
    render: (_: any, row: AnnotationWithOptions) => (
      <>
        <Button
          icon="search"
          onClick={() => setFocusedAnnotation(row)}
        />
        <Button
          icon="edit"
          onClick={() => setShowAnnotationEditor(row)}
        />
        <Button
          icon="delete"
          onClick={() => onRemoveAnnotation(row)}
        />
      </>
    ),
    title: "Actions",
    width: "180px",
  },
]

  function onSave() {
    if (name && annotations.length) {
      dispatch(saveTemplate(name, annotations));
    } else if (!showErrors) {
      setShowErrors(true);
    }
  }

  function onCancel() {
    dispatch(closeModal("templateEditor"));
  }

  function onRemoveAnnotation(annotation: AnnotationWithOptions) {
    setAnnotations(annotations.filter(a => annotation.name !== a.name));
    if (focusedAnnotation === annotation) {
      setFocusedAnnotation(undefined);
    }
  }

  const annotationOptionList = (
    <div className={styles.annotationOptionPopover}>
      {allAnnotations
      .filter(a => a.exposeToFileUploadApp)
      .filter(a => !annotations.find(a2 => a2.annotationId === a.annotationId))
      .map(a => (
        <Button
          onClick={() => setAnnotations([...annotations, a])}
        >
          <Tooltip overlay={a.description}>
            {a.name}
          </Tooltip>
        </Button>
      ))
      }
      <hr />
      <Button
        onClick={() => setShowAnnotationEditor({})}
      >
        Create new Annotation
      </Button>
    </div>

  )

  const isEditing = Boolean(templateId);
  const title = isEditing
    ? `Edit ${SCHEMA_SYNONYM}: ${name}`
    : `Create ${SCHEMA_SYNONYM}`;
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
            <div className={styles.annotationListHeader}>
              <h4>Annotations</h4>
              <Popover
                content={annotationOptionList}
              >
                <Button
                  icon="plus"
                  className={styles.addAnnotationButton}
                  onClick={() => console.log("click")}
                />
              </Popover>
            </div>
            <div className={styles.annotationContainer}>
              <div>
              <Table
                columns={columns}
                dataSource={annotations}
              />
              </div>
              {focusedAnnotation && (
                <div>
                  {focusedAnnotation.name}
                  {focusedAnnotation.description}
                  {focusedAnnotation.annotationTypeId}
                  {focusedAnnotation.annotationOptions}
                  {focusedAnnotation.lookup}
                  {focusedAnnotation.created}
                  {focusedAnnotation.createdBy}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
      <AnnotationEditorModal
        annotation={showAnnotationEditor}
        onSave={() => console.log("hey")}
        onCancel={() => setShowAnnotationEditor(undefined)}
      />
    </>
  );
}
