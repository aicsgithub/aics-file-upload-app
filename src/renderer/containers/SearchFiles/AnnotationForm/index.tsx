import { Col, Input, Select } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import { Annotation } from "../../../state/template/types";
import LookupSearch from "../../LookupSearch";
import SearchButton from "../SearchButton";

const styles = require("./styles.pcss");

interface AnnotationFormProps {
  annotation: string;
  annotationIsLookup: boolean;
  annotations: Annotation[];
  exportingCSV: boolean;
  searchLoading: boolean;
  searchValue?: string;
  onSearch: () => void;
  selectAnnotation: (annotation: string) => void;
  selectSearchValue: (searchValue?: string) => void;
  setSearchValue: (searchValue?: string) => void;
}

const selectSearchValueFromChangeEvent = (
  selectSearchValue: (searchValue?: string) => void
) => (e: React.ChangeEvent<HTMLInputElement>) =>
  selectSearchValue(e.target.value);

const AnnotationForm: React.FunctionComponent<AnnotationFormProps> = ({
  annotation,
  annotationIsLookup,
  annotations,
  exportingCSV,
  onSearch,
  searchLoading,
  searchValue,
  selectAnnotation,
  selectSearchValue,
}) => (
  <>
    <Col xs={6}>
      <LabeledInput label="Annotation">
        <Select
          showSearch={true}
          value={annotation}
          loading={!annotations.length}
          disabled={!annotations.length}
          onChange={selectAnnotation}
          placeholder="Select annotation"
          className={styles.fullWidth}
        >
          {annotations.map(({ annotationId, name }) => (
            <Select.Option key={annotationId} value={name}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </LabeledInput>
    </Col>
    <Col xs={12} xl={14} xxl={15}>
      <LabeledInput label="Search Value">
        {annotationIsLookup ? (
          <LookupSearch
            defaultOpen={true}
            key={annotation}
            lookupAnnotationName={annotation}
            placeholder="Select search value"
            selectSearchValue={selectSearchValue}
            value={searchValue}
          />
        ) : (
          <Input
            allowClear={true}
            disabled={!annotation}
            value={searchValue}
            onChange={selectSearchValueFromChangeEvent(selectSearchValue)}
            onPressEnter={onSearch}
            placeholder="Enter search value"
          />
        )}
      </LabeledInput>
    </Col>
    <Col xs={6} xl={4} xxl={3}>
      <SearchButton
        disabled={!annotation || !searchValue || searchLoading || exportingCSV}
        loading={searchLoading}
        onSearch={onSearch}
      />
    </Col>
  </>
);

export default AnnotationForm;
