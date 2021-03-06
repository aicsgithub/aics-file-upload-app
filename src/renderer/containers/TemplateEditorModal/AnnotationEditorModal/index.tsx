import { Alert, Input, Modal, Select, Spin } from "antd";
import { trim } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import FormControl from "../../../components/FormControl";
import { ColumnType } from "../../../services/labkey-client/types";
import { getRequestsInProgress } from "../../../state/feedback/selectors";
import { requestAnnotationUsage } from "../../../state/metadata/actions";
import {
  getAnnotationIdToHasBeenUsed,
  getAnnotations,
  getAnnotationTypes,
  getLookups,
} from "../../../state/metadata/selectors";
import {
  createAnnotation,
  editAnnotation,
} from "../../../state/template/actions";
import { AnnotationDraft, AsyncRequest } from "../../../state/types";

const { TextArea } = Input;

const styles = require("./styles.pcss");

interface Props {
  visible: boolean;
  annotation?: AnnotationDraft;
  onClose: () => void;
}

/**
 * This modal is for creating and editing annotations. A user can use
 * this form to create novel annotations of various types that
 * can then be used in their template or edit existing annotations.
 */
function AnnotationEditorModal(props: Props) {
  const dispatch = useDispatch();
  const lookups = useSelector(getLookups);
  const annotations = useSelector(getAnnotations);
  const annotationTypes = useSelector(getAnnotationTypes);
  const annotationIdToHasBeenUsedMap = useSelector(
    getAnnotationIdToHasBeenUsed
  );
  const activeRequests = useSelector(getRequestsInProgress);

  const [name, setName] = React.useState(props.annotation?.name || "");
  const [description, setDescription] = React.useState(
    props.annotation?.description || ""
  );
  const [showErrors, setShowErrors] = React.useState(false);
  const [lookupTable, setLookupTable] = React.useState<string | undefined>(
    props.annotation?.lookupTable
  );
  const [annotationType, setAnnotationType] = React.useState<
    string | undefined
  >(props.annotation?.annotationTypeName);
  const [dropdownOptions, setDropdownOptions] = React.useState<string[]>(
    props.annotation?.annotationOptions || []
  );

  const isLoading = activeRequests.includes(
    AsyncRequest.REQUEST_ANNOTATION_USAGE
  );
  const isDropdown = annotationType === ColumnType.DROPDOWN;
  const isLookup = annotationType === ColumnType.LOOKUP;
  const isUniqueName = !annotations.find(
    (a) =>
      a.name.toLowerCase() === name.toLowerCase() &&
      a.annotationId !== props.annotation?.annotationId
  );
  const isUnusedExistingAnnotation =
    !props.annotation ||
    annotationIdToHasBeenUsedMap[props.annotation.annotationId] === false;

  React.useEffect(() => {
    if (props.annotation) {
      dispatch(requestAnnotationUsage(props.annotation.annotationId));
    }
  }, [dispatch, props.annotation]);

  function onSave() {
    const lookup = lookups.find((l) => l.tableName === lookupTable);
    const type = annotationTypes.find((at) => at.name === annotationType);
    if (
      name &&
      type &&
      description &&
      (!isDropdown || dropdownOptions.length) &&
      (!isLookup || lookup) &&
      isUniqueName
    ) {
      const annotation = {
        name,
        annotationTypeId: type.annotationTypeId,
        description,
        annotationOptions: isDropdown ? dropdownOptions : undefined,
        lookupSchema: isLookup ? lookup?.schemaName : undefined,
        lookupTable: isLookup ? lookup?.tableName : undefined,
        lookupColumn: isLookup ? lookup?.columnName : undefined,
      };
      if (props.annotation) {
        dispatch(editAnnotation(props.annotation.annotationId, annotation));
      } else {
        dispatch(createAnnotation(annotation));
      }
      props.onClose();
    } else if (!showErrors) {
      setShowErrors(true);
    }
  }

  let title = "Create Annotation";
  if (props.annotation) {
    title = `Edit Annotation: ${props.annotation.name}`;
  }

  const content = (
    <>
      {!isUnusedExistingAnnotation && (
        <Alert
          showIcon
          type="info"
          message="Limited Editing"
          description="Some, if not all, fields are not available for editing since this annotation has been used."
        />
      )}
      <p className={styles.subTitle}>
        {props.annotation
          ? 'Edit the annotation below. After making adjustments, click "Save" to successfully edit the annotation.'
          : 'Create a new annotation below. After making adjustments, click "Save" to successfully create the annotation.'}
      </p>
      <FormControl
        className={styles.formControl}
        label="Annotation Name"
        error={
          showErrors && (!trim(name) || !isUniqueName)
            ? "Annotation Name must be present and unique"
            : undefined
        }
      >
        <Input
          value={name}
          disabled={!isUnusedExistingAnnotation}
          placeholder="Enter new annotation name here"
          onChange={(e) => setName(e.target.value)}
        />
      </FormControl>
      <FormControl
        className={styles.formControl}
        label="Description"
        error={
          showErrors && !trim(description)
            ? "Annotation Description is required"
            : undefined
        }
      >
        <TextArea
          value={description}
          placeholder="Enter new annotation description here"
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormControl>
      <FormControl
        className={styles.formControl}
        label="Data Type"
        error={
          showErrors && !annotationType
            ? "Annotation Data Type is required"
            : undefined
        }
      >
        <Select
          className={styles.select}
          disabled={!isUnusedExistingAnnotation}
          onSelect={(v: string) => setAnnotationType(v)}
          placeholder="Select annotation data type"
          value={annotationType}
        >
          {annotationTypes.map((type) => (
            <Select.Option key={type.name}>{type.name}</Select.Option>
          ))}
        </Select>
      </FormControl>
      {isDropdown &&
        (isUnusedExistingAnnotation ? (
          <FormControl
            className={styles.formControl}
            label="Dropdown Options"
            error={
              showErrors && !dropdownOptions.length
                ? "Dropdown Options are required"
                : undefined
            }
          >
            <Select
              mode="tags"
              className={styles.select}
              value={dropdownOptions}
              placeholder="Enter dropdown options"
              onChange={(v: string[]) => setDropdownOptions(v)}
            />
          </FormControl>
        ) : (
          <>
            <FormControl
              className={styles.formControl}
              label="Existing Dropdown Options"
            >
              <Select
                disabled
                mode="tags"
                className={styles.select}
                value={props.annotation?.annotationOptions || []}
                onChange={(v: string[]) => setDropdownOptions(v)}
              />
            </FormControl>
            <FormControl
              className={styles.formControl}
              label="New Dropdown Options"
            >
              <Select
                mode="tags"
                className={styles.select}
                value={dropdownOptions?.filter(
                  (ao) => !props.annotation?.annotationOptions?.includes(ao)
                )}
                placeholder="Enter new dropdown options"
                onChange={(v: string[]) =>
                  setDropdownOptions(
                    v.concat(props.annotation?.annotationOptions || [])
                  )
                }
              />
            </FormControl>
          </>
        ))}
      {isLookup && (
        <FormControl
          className={styles.formControl}
          label="Lookup Reference"
          error={
            showErrors && !lookupTable
              ? "Annotation Lookup Reference is required"
              : undefined
          }
        >
          <Select
            className={styles.select}
            disabled={!isUnusedExistingAnnotation}
            onSelect={(v: string) => setLookupTable(v)}
            placeholder="Select Lookup"
            showSearch={true}
            value={lookupTable}
          >
            {lookups
              .sort((a, b) => a.tableName.localeCompare(b.tableName))
              .map(({ tableName }) => (
                <Select.Option key={tableName}>{tableName}</Select.Option>
              ))}
          </Select>
        </FormControl>
      )}
    </>
  );

  return (
    <Modal
      destroyOnClose // Unmount child components
      width="90%"
      title={title}
      visible={props.visible}
      onOk={onSave}
      onCancel={props.onClose}
      okText="Save"
      maskClosable={false}
    >
      {isLoading ? (
        <div className={styles.spinContainer}>
          <div>Loading annotation...</div>
          <Spin />
        </div>
      ) : (
        content
      )}
    </Modal>
  );
}

// Create a new instance of the modal whenever visiblity is toggled rather
// than deriving the inner state based on prop changes (derived state). The
// reason we would have to derive state is because, for example, when a
// user edits a couple inputs and then closes the modal the state will still
// have those edited state values which we would reset on close or on save,
// but that still doesn't reset them to pull their initial state values from
// the annotation prop as currently happens on new instance creation of the
// component
export default function CreateAnnotationModalWrapper(props: Props) {
  return <AnnotationEditorModal key={`${props.visible}`} {...props} />;
}
