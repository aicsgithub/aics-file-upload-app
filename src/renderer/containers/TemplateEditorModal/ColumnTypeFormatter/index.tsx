// import { Icon, Popover } from "antd";
// import { isEmpty } from "lodash";
// import * as React from "react";
//
// import { ColumnType } from "../../../state/setting/types";
//
// import FormControl from "../../../components/FormControl/index";
//
// import { COLUMN_TYPE_DISPLAY_MAP, ColumnTypeValue } from "../index";
//
// const styles = require("./styles.pcss");
//
// interface Props {
//     value?: ColumnTypeValue;
// }
//
// const ColumnTypeFormatter: React.FunctionComponent<Props> = ({value}: Props) => {
//     if (!value) {
//         return <FormControl error="Column Type is required"/>;
//     }
//
//     const {
//         column,
//         dropdownValues,
//         table,
//         type,
//     } = value;
//     const isDropdown = type === ColumnType.DROPDOWN;
//     const isLookup = type === ColumnType.LOOKUP;
//
//     let error;
//     let popoverContent;
//     if (!type) {
//         error = "Column Type is required";
//     }
//
//     if (isDropdown) {
//         if (dropdownValues && !isEmpty(dropdownValues)) {
//             popoverContent = dropdownValues.map((option) => (
//                 <div className={styles.dropdownValue} key={option}>{option}</div>
//             ));
//         } else {
//             error = "Dropdown values are required";
//         }
//     }
//
//     if (isLookup) {
//         if (table && column) {
//             popoverContent = (
//                 <div className={styles.dropdownValue}>
//                     <strong>Table</strong>: {table} <strong>Column</strong>: {column}
//                 </div>
//             );
//         } else {
//             error = "Table and Column are required";
//         }
//     }
//
//     const popover = (
//         <div className={styles.popoverBody}>
//             {popoverContent}
//         </div>
//     );
//
//     return (
//         <FormControl className={styles.container} error={error}>
//             {COLUMN_TYPE_DISPLAY_MAP[type]}
//
//             {popoverContent && <Popover
//                 className={styles.popover}
//                 content={popover}
//                 title="Value"
//                 trigger="hover"
//             >
//                 <Icon type="info-circle"/>
//             </Popover>}
//         </FormControl>
//     );
// };
//
// export default ColumnTypeFormatter;
