import * as React from "react";
import { Resizable } from "react-resizable";

interface Props {
  onClick: (e: React.MouseEvent) => void;
  onResize: () => void;
  width: number;
  [prop: string]: any;
}

export default function ResizeableHeader(props: Props) {
  const { onResize, width, onClick, ...restProps } = props;
  const [allowClick, setAllowClick] = React.useState(true);

  if (!width) {
    return <th {...restProps} />;
  }
  console.log("resizable", width, props);

  return (
    <Resizable
      width={width}
      height={0}
      onResize={onResize}
      onResizeStart={(_) => {
        console.log("onResizeStart")
        setAllowClick(false);
      }}
      // handle={(
      //   <div>
      //     This!
      //   </div>
      // )}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th 
        {...restProps} 
        // onMouseDown={(_) => {
        //   console.log("onMouseDown")
        //   setAllowClick(true);
        // }}
        onClick={(e) => {
          console.log(allowClick,  "onClick");
          false && onClick(e)
        }}
      />
    </Resizable>
  );
};
