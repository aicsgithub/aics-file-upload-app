import { List, Popover, Tag } from "antd";
import * as React from "react";

import { LIST_DELIMITER_JOIN } from "../../../constants";
import {
  Annotation,
  AnnotationDraft,
  AnnotationType,
  Lookup,
  TemplateDraft,
} from "../../../state/template/types";
import AnnotationForm from "../AnnotationForm";
import IconText from "../IconText";

const styles = require("./styles.pcss");

interface AnnotationListItemProps {
  addAnnotation: (draft: AnnotationDraft) => void;
  allAnnotations: Annotation[];
  annotation: AnnotationDraft;
  annotationTypes: AnnotationType[];
  cancelEditAnnotation: () => void;
  className?: string;
  forbiddenAnnotationNames: Set<string>;
  handleVisibleChange: (visible: boolean) => void;
  isSelected: boolean;
  removeAnnotation: () => void;
  tables: Lookup[];
  template: TemplateDraft;
  updateAnnotation: (index: number, row: Partial<AnnotationDraft>) => void;
}

class AnnotationListItem extends React.Component<AnnotationListItemProps, {}> {
  constructor(props: AnnotationListItemProps) {
    super(props);
    this.state = {};
  }

  public render() {
    const {
      addAnnotation,
      allAnnotations,
      annotation,
      annotationTypes,
      cancelEditAnnotation,
      className,
      forbiddenAnnotationNames,
      handleVisibleChange,
      isSelected,
      removeAnnotation,
      tables,
      template,
      updateAnnotation,
    } = this.props;
    const {
      annotationId,
      annotationOptions,
      annotationTypeName,
      description,
      lookupTable,
      name,
      required,
    } = annotation;
    const tags: Array<{ color: string; text: string }> = [];
    tags.push({ color: "green", text: annotationTypeName });
    tags.push({ color: "red", text: required ? "Required" : "Optional" });
    tags.push({
      color: "purple",
      text: annotationId ? "Existing Annotation" : "New",
    });

    let metadata;
    if (lookupTable) {
      metadata = `Lookup table: ${lookupTable}`;
    } else if (annotationOptions && annotationOptions.length) {
      metadata = `Dropdown values: ${annotationOptions.join(
        LIST_DELIMITER_JOIN
      )}`;
    }

    const title = (
      <div>
        <h4 className={styles.annotationName}>{name}</h4>
        {tags.map(({ color, text }) => (
          <Tag color={color} key={text} className={styles.tag}>
            {text}
          </Tag>
        ))}
      </div>
    );

    const editButton = (
      <Popover
        content={
          <AnnotationForm
            addAnnotation={addAnnotation}
            annotation={annotation}
            annotationTypes={annotationTypes}
            cancel={cancelEditAnnotation}
            existingAnnotations={allAnnotations}
            forbiddenAnnotationNames={forbiddenAnnotationNames}
            index={annotation.index}
            lookups={tables}
            templateAnnotations={template.annotations}
            updateAnnotation={updateAnnotation}
          />
        }
        trigger="click"
        visible={isSelected}
        onVisibleChange={handleVisibleChange}
      >
        <IconText icon="edit" key="edit" text="Edit" />
      </Popover>
    );

    return (
      <List.Item
        className={className}
        key={name}
        actions={[
          <IconText
            icon="delete"
            key="delete"
            onClick={removeAnnotation}
            text="Remove"
          />,
          editButton,
        ]}
      >
        <List.Item.Meta description={metadata} title={title} />
        {description}
      </List.Item>
    );
  }
}

export default AnnotationListItem;
