import { Input, Modal, Select } from "antd";
import { trim } from "lodash";
import React from "react";
import { useSelector } from "react-redux";
import FormControl from "../../../components/FormControl";
import { AnnotationType, ColumnType } from "../../../services/labkey-client/types";
import { getAnnotationTypes, getLookups } from "../../../state/metadata/selectors";
import { AnnotationWithOptions } from "../../../state/template/types";

const { TextArea } = Input;

const styles = require("./styles.pcss");

interface Props {
    annotation?: Partial<AnnotationWithOptions>;
    onSave: () => void;
    onCancel: () => void;
}

export default function AnnotationEditorModal(props: Props) {
    const lookups = useSelector(getLookups);
    const annotationTypes = useSelector(getAnnotationTypes);

    const [name, setName] = React.useState("");
    const [lookup, setLookup] = React.useState();
    const [description, setDescription] = React.useState("");
    const [showErrors, setShowErrors] = React.useState(false);
    const [annotationType, setAnnotationType] = React.useState<AnnotationType>();
    const [dropdownOptions, setDropdownOptions] = React.useState<string[]>([]);

    React.useEffect(() => {
        setName(props.annotation?.name || "");
        setLookup(props.annotation?.lookup);
        setDescription(props.annotation?.description || "");
        setAnnotationType(annotationTypes.find(at => at.annotationTypeId === props.annotation?.annotationTypeId));
        setDropdownOptions(props.annotation?.annotationOptions || []);
    }, [props.annotation, annotationTypes]);

    const isDropdown = annotationType?.name === ColumnType.DROPDOWN;
    const isLookup = !isDropdown && annotationType?.name === ColumnType.LOOKUP;

    function onSave() {
        if (name && annotationType && description && (!isDropdown || dropdownOptions.length) && (!isLookup || lookup)) {
            props.onSave({ annotationId: props.annotation?.annotationId, name, annotationType, dropdownOptions, lookup });
        } else if (!showErrors) {
            setShowErrors(true);
        }
    }

    return (
        <Modal
          width="90%"
          title="Annotation Editor"
          visible={!!props.annotation}
          onOk={onSave}
          onCancel={props.onCancel}
          okText="Save"
          maskClosable={false}
          destroyOnClose={true} // Unmount child components
        >
            <p className={styles.subTitle}>Create a new annotation below. After making adjustments, click "Save" to successfully create the annotation.</p>
            <FormControl
            className={styles.formControl}
            label="Annotation Name"
            error={
                (showErrors && !name)
                ? "Annotation Name is required"
                : undefined
            }
            >
                <Input readOnly={!!props.annotation?.annotationId} value={name} onChange={(e) => setName(trim(e.target.value))} />
            </FormControl>
            <FormControl
                className={styles.formControl}
                label="Description"
                error={
                    (showErrors && !description)
                    ? "Annotation Description is required"
                    : undefined
                }
            >
                <TextArea readOnly={!!props.annotation?.annotationId} value={name} onChange={(e) => setDescription(trim(e.target.value))} />
            </FormControl>
            <FormControl
                className={styles.formControl}
                label="Data Type"
                error={
                    (showErrors && !annotationType)
                    ? "Annotation Data Type is required"
                    : undefined
                }
            >
                <Select
                className={styles.search}
                onSelect={(v: AnnotationType) => setAnnotationType(v)}
                placeholder="Select Data Type"
                showSearch={true}
                value={annotationType}
                disabled={!!props.annotation?.annotationId}
                >
                    {annotationTypes.map((type) => (
                        <Select.Option key={type.name}>{type.name}</Select.Option>
                    ))}
                </Select>
            </FormControl>
            {isDropdown && (
                  <FormControl
                  className={styles.formControl}
                  label="Dropdown Values"
                  error={
                      (showErrors && !dropdownOptions.length)
                      ? "Dropdown Values are required"
                      : undefined
                  }
                  >
                      <Input readOnly={!!props.annotation?.annotationId} multiple value={name} onChange={(e) => setDropdownOptions([])} />
                  </FormControl>
            )}
            {isLookup && (
            <FormControl
                className={styles.formControl}
                label="Lookup Reference"
                error={
                    (showErrors && !lookup)
                    ? "Annotation Lookup Type is required"
                    : undefined
                }
            >
                <Select
                    className={styles.search}
                    onSelect={(v: any) => setLookup(v)}
                    placeholder="Select Lookup"
                    showSearch={true}
                    value={lookups}
                    disabled={!!props.annotation?.annotationId}
                >
                    {lookups.map((lookup) => (
                        <Select.Option key={lookup.tableName}>{lookup.tableName}</Select.Option>
                    ))}
                </Select>
                </FormControl>
            )}
        </Modal>
    )
}
