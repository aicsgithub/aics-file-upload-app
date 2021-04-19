import { Modal, Select } from "antd";
import React from "react";

import FormControl from "../../../components/FormControl";
import { AnnotationDraft } from "../../../state/types";

const styles = require("./styles.pcss");

interface Props {
  annotation?: AnnotationDraft;
  onClose: () => void;
  onSave: (newDropdownOptions: string[]) => void;
}

/**
 * Modal for creating new dropdown options for "Dropdown" type annotations.
 * In the future this could be generalized or combined with CreateAnnotationModal.
 * However for now, we are only able to allow users to create new annotation options,
 * edits like changing the name, description, or lookup column are out of reach.
 */
function DropdownEditorModal(props: Props) {
  const [newDropdownOptions, setNewDropdownOptions] = React.useState<string[]>(
    []
  );

  function onSave() {
    props.onSave(newDropdownOptions);
    props.onClose();
  }

  return (
    <Modal
      destroyOnClose // Unmount child components
      width="90%"
      title="New Annotation"
      visible={!!props.annotation}
      onOk={onSave}
      onCancel={props.onClose}
      okText="Save"
      okButtonProps={{ disabled: !newDropdownOptions.length }}
      maskClosable={false}
    >
      <FormControl className={styles.form} label="Current Dropdown Options">
        <Select
          disabled
          mode="tags"
          className={styles.select}
          value={props.annotation?.annotationOptions}
        />
      </FormControl>
      <FormControl className={styles.form} label="New Dropdown Options">
        <Select
          autoFocus
          mode="tags"
          className={styles.select}
          value={newDropdownOptions}
          placeholder="Enter new dropdown options"
          onChange={(v: string[]) =>
            setNewDropdownOptions(
              v.filter((o) => !props.annotation?.annotationOptions?.includes(o))
            )
          }
        />
      </FormControl>
    </Modal>
  );
}

// Ensure the modal is completely rebuilt each time a new annotation is passed in
export default function DropdownEditorModalWrapper(props: Props) {
  return <DropdownEditorModal key={props.annotation?.name} {...props} />;
}
