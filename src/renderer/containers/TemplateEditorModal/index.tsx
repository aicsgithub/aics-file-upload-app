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
import { ColumnProps } from "antd/es/table";
import { ipcRenderer } from "electron";
import { castArray, trim } from "lodash";
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
  getRequestsInProgress,
  getTemplateEditorVisible,
} from "../../state/feedback/selectors";
import { getAnnotationsWithAnnotationOptions } from "../../state/metadata/selectors";
import { getShowTemplateHint } from "../../state/setting/selectors";
import {
  addExistingAnnotation,
  addExistingTemplate,
  removeAnnotations,
  saveTemplate,
  updateTemplateDraft,
} from "../../state/template/actions";
import { getTemplateDraft } from "../../state/template/selectors";
import { AnnotationDraft, AsyncRequest } from "../../state/types";

import AnnotationEditorModal from "./AnnotationEditorModal";

const styles = require("./styles.pcss");

const { Search } = Input;

const COLUMN_TEMPLATE_DESCRIPTION = `A ${SCHEMA_SYNONYM} defines a group of annotations to associate with files.
When applied to a batch of files to upload, the annotations associated with that template
will be added as additional columns to fill out for each file. They can be shared and discovered by anyone.`;

interface Props {
  className?: string;
  visible?: boolean;
}

interface AnnotationKeys {
  key: string;
  value: string;
}

const FOCUSED_ANNOTATION_KEYS = [
  { key: "name", title: "Name" },
  { key: "description", title: "Description" },
  { key: "annotationTypeName", title: "Data Type" },
  { key: "annotationOptions", title: "Dropdown Options" },
  { key: "lookupTable", title: "Lookup Reference" },
  { key: "created", title: "Created" },
];

const FOCUSED_ANNOTATION_COLUMNS: ColumnProps<AnnotationKeys>[] = [
  {
    dataIndex: "key",
    width: "150px",
  },
  {
    dataIndex: "value",
  },
];

/**
 * Modal for creating or editing a user defined Template of Annotations.
 * This editor allows users to choose a name to identify the Template with
 * as well as choose which Annotations to include in the Template. Users can
 * also update limited aspects of the Annotations like the dropdown options
 * if relevant.
 */
function TemplateEditorModal(props: Props) {
  const dispatch = useDispatch();
  const template = useSelector(getTemplateDraft);
  const showTemplateHint = useSelector(getShowTemplateHint);
  const allAnnotations = useSelector(getAnnotationsWithAnnotationOptions);
  const requestsInProgress = useSelector(
    getRequestsInProgress
  ) as AsyncRequest[];

  const [showErrors, setShowErrors] = React.useState(false);
  const [annotationSearchValue, setAnnotationSearchValue] = React.useState<
    string
  >();
  const [showAnnotationEditor, setShowAnnotationEditor] = React.useState(false);
  const [annotationToEdit, setAnnotationToEdit] = React.useState<
    AnnotationDraft
  >();
  const [focusedAnnotation, setFocusedAnnotation] = React.useState<
    AnnotationDraft
  >();

  const isEditing = Boolean(template && template.templateId);
  const isLoading = requestsInProgress.some((r) =>
    [
      AsyncRequest.GET_TEMPLATE,
      AsyncRequest.CREATE_ANNOTATION,
      AsyncRequest.SAVE_TEMPLATE,
    ].includes(r)
  );

  // Necessary to catch template interactions from the menu bar
  React.useEffect(() => {
    function showModal() {
      dispatch(openModal("templateEditor"));
    }
    ipcRenderer.on(OPEN_TEMPLATE_MENU_ITEM_CLICKED, showModal);
    return () => {
      ipcRenderer.removeListener(OPEN_TEMPLATE_MENU_ITEM_CLICKED, showModal);
    };
  }, [dispatch]);

  function onNameChange(e?: React.ChangeEvent<HTMLInputElement>) {
    dispatch(updateTemplateDraft({ name: e?.target.value || "" }));
  }

  function onUpdateTemplateAnnotation(
    index: number,
    update: Partial<AnnotationDraft>
  ) {
    const annotation = {
      ...template.annotations[index],
      ...update,
    };
    const annotations = [...template.annotations];
    annotations[index] = annotation;
    dispatch(updateTemplateDraft({ annotations }));
    if (focusedAnnotation === template.annotations[index]) {
      setFocusedAnnotation(annotation);
    }
  }

  function onRemoveAnnotation(index: number) {
    dispatch(removeAnnotations([index]));
    if (
      focusedAnnotation?.annotationId ===
      template.annotations[index].annotationId
    ) {
      setFocusedAnnotation(undefined);
    }
  }

  function onSave() {
    if (template.name && trim(template.name) && template.annotations.length) {
      dispatch(saveTemplate());
    } else if (!showErrors) {
      setShowErrors(true);
    }
  }

  const columns: ColumnProps<AnnotationDraft>[] = [
    {
      dataIndex: "name",
      key: "name",
      title: "Name",
      render: function TooltipName(name: string, row) {
        return <Tooltip overlay={row.description}>{name}</Tooltip>;
      },
    },
    {
      align: "center",
      dataIndex: "required",
      key: "required",
      render: function RequiredCheckbox(required: boolean, _, index) {
        return (
          <Checkbox
            checked={required}
            onChange={() =>
              onUpdateTemplateAnnotation(index, { required: !required })
            }
          />
        );
      },
      title: "Required",
      width: "125px",
    },
    {
      align: "right",
      key: "actions",
      render: function Actions(_, row, index) {
        return (
          <>
            <Button
              icon="search"
              title="View"
              onClick={() => setFocusedAnnotation(row)}
            />
            <Button
              icon="edit"
              title="Edit"
              onClick={() => setAnnotationToEdit(row)}
            />
            <Button
              icon="delete"
              title="Remove"
              onClick={() => onRemoveAnnotation(index)}
            />
          </>
        );
      },
      title: "Actions",
      width: "125px",
    },
  ];

  const focusedAnnotationData = React.useMemo(() => {
    if (!focusedAnnotation) {
      return [];
    }
    return FOCUSED_ANNOTATION_KEYS.flatMap(({ key, title }) => {
      const annotation = focusedAnnotation as { [key: string]: any };
      const value = annotation[key] && castArray(annotation[key]).join(", ");
      if (value) {
        return [{ key: title, value }];
      }
      return [];
    });
  }, [focusedAnnotation]);

  function onCloseAnnotationModal() {
    setAnnotationToEdit(undefined);
    setShowAnnotationEditor(false);
  }

  const annotationOptionList = (
    <>
      <Search
        allowClear
        value={annotationSearchValue}
        placeholder="Search annotations..."
        onChange={(e) => setAnnotationSearchValue(e.target.value)}
      />
      <div className={styles.annotationOptionPopover}>
        {allAnnotations
          .filter((a) => a.exposeToFileUploadApp)
          .filter(
            (a) =>
              !template.annotations.find(
                (a2) => a2.annotationId === a.annotationId
              ) &&
              a.name
                .toLowerCase()
                .includes(annotationSearchValue?.toLowerCase() || "")
          )
          .map((a) => (
            <Tooltip key={a.name} overlay={a.description} placement="left">
              <Button onClick={() => dispatch(addExistingAnnotation(a))}>
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

  const title = isEditing
    ? `Edit ${SCHEMA_SYNONYM}: ${template.name}`
    : `Create ${SCHEMA_SYNONYM}`;
  return (
    <>
      <Modal
        visible={props.visible}
        width="90%"
        className={props.className}
        title={title}
        onOk={onSave}
        onCancel={() => dispatch(closeModal("templateEditor"))}
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
                onSelect={(t) => dispatch(addExistingTemplate(t))}
              />
            </LabeledInput>
            <div className={styles.or}>-&nbsp;or&nbsp;-</div>
            {!isEditing && (
              <FormControl
                className={styles.formControl}
                label="Template Name"
                error={
                  showErrors && !trim(template.name)
                    ? "Template Name is required"
                    : undefined
                }
              >
                <Input value={template.name} onChange={onNameChange} />
              </FormControl>
            )}
            <div className={styles.annotationListHeader}>
              <FormControl
                className={styles.annotationLabel}
                label="Annotations"
                error={
                  showErrors && !template.annotations.length
                    ? "Must have at least one annotation"
                    : undefined
                }
              />
              <Popover content={annotationOptionList} placement="right">
                <Button icon="plus" className={styles.addAnnotationButton} />
              </Popover>
            </div>
            <div className={styles.annotationContainer}>
              <Table
                rowKey="name"
                size="small"
                columns={columns}
                pagination={false}
                dataSource={template.annotations}
                rowClassName={(row) =>
                  row === focusedAnnotation ? styles.highlighted : undefined
                }
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
      <AnnotationEditorModal
        visible={showAnnotationEditor || !!annotationToEdit}
        annotation={annotationToEdit}
        onClose={onCloseAnnotationModal}
      />
    </>
  );
}

export default function TemplateEditorModalWrapper(props: Props) {
  const visible = useSelector(getTemplateEditorVisible);
  return (
    <TemplateEditorModal key={`${visible}`} visible={visible} {...props} />
  );
}
