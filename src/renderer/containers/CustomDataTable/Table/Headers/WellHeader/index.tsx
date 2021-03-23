import React from "react";

import { WELL_ANNOTATION_NAME } from "../../../../../constants";
import { CustomCell } from "../../DefaultCells/DisplayCell";
import DefaultHeader from "../DefaultHeader";

/*
    This component essentially just wraps the DefaultHeader
    swapping out the column id for a more readable one
*/
export default function WellHeader(props: CustomCell) {
  return <DefaultHeader {...props} name={WELL_ANNOTATION_NAME} />;
}
