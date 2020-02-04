import { Col, Input, Select } from "antd";
import * as React from "react";

import LabeledInput from "../../../components/LabeledInput";
import { Annotation } from "../../../state/template/types";
import LookupSearch from "../../LookupSearch";

import SearchButton from "../SearchButton";

const styles = require("./styles.pcss");

interface AnnotationFormProps {
    annotation: string;
    annotations: Annotation[];
    exportingCSV: boolean;
    optionsForLookup?: string[];
    optionsForLookupLoading: boolean;
    searchLoading: boolean;
    searchValue?: string;
    onSearch: () => void;
    selectAnnotation: (annotation: string) => void;
    selectSearchValue: (searchValue?: string) => void;
    setSearchValue: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AnnotationForm: React.FunctionComponent<AnnotationFormProps> = ({
                                                                        annotation,
                                                                        annotations,
                                                                        exportingCSV,
                                                                        optionsForLookup,
                                                                        optionsForLookupLoading,
                                                                        onSearch,
                                                                        searchLoading,
                                                                        searchValue,
                                                                        selectAnnotation,
                                                                        selectSearchValue,
                                                                        setSearchValue,
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
                    placeholder="Select Annotation"
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
                {(optionsForLookupLoading || optionsForLookup) ? (
                    <LookupSearch
                        className={styles.fullWidth}
                        lookupAnnotationName={annotation}
                        placeholder="Select Search Value"
                        searchValue={searchValue}
                        selectSearchValue={selectSearchValue}
                    />
                ) : (
                    <Input
                        allowClear={true}
                        disabled={!annotation}
                        value={searchValue}
                        onChange={setSearchValue}
                        onPressEnter={onSearch}
                        placeholder="Enter Search Value"
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
