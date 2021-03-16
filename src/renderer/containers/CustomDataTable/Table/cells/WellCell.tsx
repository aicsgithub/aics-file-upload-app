import React from "react";

import { CustomCell } from "../../types";

export default function WellCell({ value: initialValue }: CustomCell) {
  return <div>{initialValue}</div>;
}
