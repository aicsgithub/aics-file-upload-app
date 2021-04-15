import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  Popover,
  Spin,
  Table,
  Tooltip,
} from "antd";
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
import { Template, TemplateAnnotation } from "../../services/mms-client/types";
import { closeModal, openModal } from "../../state/feedback/actions";
import { getTemplateEditorVisible } from "../../state/feedback/selectors";
import { requestAnnotations } from "../../state/metadata/actions";
import { getAnnotationsWithAnnotationOptions } from "../../state/metadata/selectors";
import { getShowTemplateHint } from "../../state/setting/selectors";
import { saveTemplate } from "../../state/template/actions";
import { AnnotationWithOptions } from "../../state/template/types";

import CreateAnnotationModal from "./CreateAnnotationModal";
import DropdownEditorModal from "./DropdownEditorModal";

const styles = require("./styles.pcss");

const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

interface Props {
  className?: string;
}

const FOCUSED_ANNOTATION_KEYS = [
  { key: "name", title: "Name" },
  { key: "description", title: "Description" },
  { key: "type", title: "Data Type" },
  { key: "annotationOptions", title: "Dropdown Options" },
  { key: "lookup", title: "Lookup Reference" },
  { key: "created", title: "Created" },
  { key: "createdBy", title: "Created By" },
];

const FOCUSED_ANNOTATION_COLUMNS = [
  {
    dataIndex: "key",
    title: "Key",
    width: "150px",
  },
  {
    dataIndex: "value",
    ellipsis: true,
    title: "Value",
    width: "100%",
  },
];

/**
 * TODO
 */
function TemplateEditorModal(props: Props) {
  const dispatch = useDispatch();
  const showTemplateHint = useSelector(getShowTemplateHint);
  const allAnnotations = useSelector(getAnnotationsWithAnnotationOptions);

  const [name, setName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [annotations, setAnnotations] = React.useState<TemplateAnnotation[]>(
    []
  );
  const [showDropdownEditor, setShowDropdownEditor] = React.useState<
    TemplateAnnotation
  >();
  const [showAnnotationEditor, setShowAnnotationEditor] = React.useState(false);
  const [focusedAnnotation, setFocusedAnnotation] = React.useState<
    TemplateAnnotation
  >();

  const templateToEdit: Template | undefined = undefined;

  // Necessary to catch template interactions from the menu bar
  React.useEffect(() => {
    function showModal() {
      dispatch(requestAnnotations());
      dispatch(openModal("templateEditor"));
    }
    ipcRenderer.on(OPEN_TEMPLATE_MENU_ITEM_CLICKED, showModal);
    return () => {
      ipcRenderer.removeListener(OPEN_TEMPLATE_MENU_ITEM_CLICKED, showModal);
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (templateToEdit) {
      setIsLoading(true);
      // setName(templateToEdit.annotations);
      // setAnnotations(templateToEdit.annotations);
    }
  }, [templateToEdit]);

  function onSave() {
    if (name && annotations.length) {
      dispatch(saveTemplate(name, annotations, templateToEdit?.templateId));
    } else if (!showErrors) {
      setShowErrors(true);
    }
  }

  function onCancel() {
    dispatch(closeModal("templateEditor"));
  }

  function onRemoveAnnotation(annotation: AnnotationWithOptions) {
    setAnnotations(annotations.filter((a) => annotation.name !== a.name));
    if (focusedAnnotation === annotation) {
      setFocusedAnnotation(undefined);
    }
  }

  function toggleAnnotationIsRequired(annotation: TemplateAnnotation) {
    setAnnotations(
      annotations.map((a) => ({
        ...a,
        required: a.name === annotation.name ? !a.required : a.required,
      }))
    );
  }

  function onCopyExistingTemplate(templateId: number) {
    console.log("copy from existing", templateId);
  }

  const columns = [
    {
      dataIndex: "name",
      ellipsis: true,
      key: "name",
      title: "Name",
      width: "100%",
      render: (name: string, row: TemplateAnnotation) => (
        <Tooltip overlay={row.description}>{name}</Tooltip>
      ),
    },
    {
      align: "center",
      dataIndex: "required",
      key: "required",
      render: (required: boolean, row: TemplateAnnotation) => (
        <Checkbox
          checked={required}
          onChange={() => toggleAnnotationIsRequired(row)}
        />
      ),
      title: "Required",
      width: "130px",
    },
    {
      align: "right",
      key: "actions",
      render: (_: any, row: TemplateAnnotation) => (
        <>
          <Button
            icon="search"
            title="View"
            onClick={() => setFocusedAnnotation(row)}
          />
          {!!row.annotationOptions?.length && (
            <Button
              icon="edit"
              disabled={!row.annotationOptions?.length}
              onClick={() => setShowDropdownEditor(row)}
            />
          )}
          <Button
            icon="delete"
            title="Remove"
            onClick={() => onRemoveAnnotation(row)}
          />
        </>
      ),
      title: "Actions",
      width: "180px",
    },
  ];

  const focusedAnnotationData = React.useMemo(() => {
    if (!focusedAnnotation) {
      return [];
    }
    return FOCUSED_ANNOTATION_KEYS.flatMap(({ key, title }) => {
      const annotation = focusedAnnotation as { [key: string]: any };
      const value = annotation[key];
      if (value) {
        return [{ key: title, value }];
      }
      return [];
    });
  }, [focusedAnnotation]);

  const annotationOptionList = (
    <>
      <div className={styles.annotationOptionPopover}>
        {allAnnotations
          .filter((a) => a.exposeToFileUploadApp)
          .filter(
            (a) => !annotations.find((a2) => a2.annotationId === a.annotationId)
          )
          .map((a) => (
            <Tooltip key={a.name} overlay={a.description} placement="left">
              <Button onClick={() => setAnnotations([...annotations, a] as any)}>
                {a.name}
              </Button>
            </Tooltip>
          ))}
      </div>
      <Button
        className={styles.createAnnotationButton}
        icon="plus"
        onClick={() => setShowAnnotationEditor(true)}
      >
        Create new Annotation
      </Button>
    </>
  );

  const isEditing = Boolean(templateToEdit);
  const title = isEditing
    ? `Edit ${SCHEMA_SYNONYM}: ${name}`
    : `Create ${SCHEMA_SYNONYM}`;
  return (
    <>
      <Modal
        visible
        width="90%"
        className={props.className}
        title={title}
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
                onSelect={(t) => dispatch(onCopyExistingTemplate(t))}
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
              <FormControl
                className={styles.annotationLabel}
                label="Annotations"
                error={
                  showErrors && !annotations.length
                    ? "Must have at least one annotation"
                    : undefined
                }
              />
              <Popover content={annotationOptionList} placement="right">
                <Button
                  icon="plus"
                  className={styles.addAnnotationButton}
                  onClick={() => console.log("click")}
                />
              </Popover>
            </div>
            <div className={styles.annotationContainer}>
              <Table
                rowKey="name"
                size="small"
                columns={columns as any}
                pagination={false}
                dataSource={annotations}
              />
              {focusedAnnotation && (
                <Table
                  size="small"
                  showHeader={false}
                  pagination={false}
                  columns={FOCUSED_ANNOTATION_COLUMNS}
                  dataSource={focusedAnnotationData}
                />
              )}
            </div>
          </>
        )}
      </Modal>
      <CreateAnnotationModal
        visible={showAnnotationEditor}
        onClose={() => setShowAnnotationEditor(false)}
      />
      <DropdownEditorModal
        annotation={showDropdownEditor}
        onClose={() => setShowDropdownEditor(undefined)}
      />
    </>
  );
}

export default function TemplateEditorModalWrapper(props: Props) {
  const visible = useSelector(getTemplateEditorVisible);
  if (!visible) {
    return null;
  }
  return <TemplateEditorModal {...props} />;
}
