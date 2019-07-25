import * as classNames from "classnames";
import * as React from "react";
import {RefObject} from "react";

const styles = require("./style.pcss");

interface Padding {
    readonly paddingBottom?: string;
    readonly paddingLeft?: string;
    readonly paddingRight?: string;
    readonly paddingTop?: string;
}

interface ResizableProps {
    borderSizeInPixels?: number;
    bottom?: boolean;
    children: JSX.Element | Array<JSX.Element | null>;
    className?: string;
    height?: number;
    left?: boolean;
    minimumHeight?: number;
    minimumWidth?: number;
    right?: boolean;
    top?: boolean;
    width?: number;
}

interface ResizableState {
    height?: number;
    userResizeOriginX?: number;
    userResizeOriginY?: number;
    width?: number;
}

class Resizable extends React.Component<ResizableProps, ResizableState> {
    private readonly borderSizeInPixels: number;
    private readonly cursor: string;
    private readonly divRef: RefObject<HTMLDivElement> | null;
    private readonly minimumHeight: number;
    private readonly minimumWidth: number;
    private readonly padding?: Padding;

    constructor(props: ResizableProps) {
        super(props);
        this.state = {
            height: this.props.height,
            width: this.props.width,
        };

        this.borderSizeInPixels = this.props.borderSizeInPixels || 10;
        this.cursor = this.determineCursor();
        this.minimumHeight = this.props.minimumHeight || 10;
        this.minimumWidth = this.props.minimumWidth || 10;
        this.padding = {
            paddingBottom: this.props.bottom ? `${this.borderSizeInPixels}px` : undefined,
            paddingLeft: this.props.left ? `${this.borderSizeInPixels}px` : undefined,
            paddingRight: this.props.right ? `${this.borderSizeInPixels}px` : undefined,
            paddingTop: this.props.top ? `${this.borderSizeInPixels}px` : undefined,
        };
        this.divRef = React.createRef<HTMLDivElement>();
        this.onMouseMove = this.onMouseMove.bind(this);
    }

    public componentWillMount() {
        if (!this.props.width && (this.props.left || this.props.right)) {
            throw Error("Width required if component is supposed to resize horizontally");
        }
        if (!this.props.height && (this.props.top || this.props.bottom)) {
            throw Error("Height required if component is supposed to resize vertically");
        }
    }

    public componentDidMount() {
        // Have to attach mouseup & mouseover to window because we want them to be able to go outside the div
        window.addEventListener("mouseup", this.onMouseUp);
        window.addEventListener("mousemove", this.onMouseMove);
        this.divRef!.current!.addEventListener("mousedown", this.onMouseDown);
    }

    public componentWillUnmount() {
        window.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("mousemove", this.onMouseMove);
        this.divRef!.current!.removeEventListener("mousedown", this.onMouseDown);
    }

    public render() {
        const { cursor, divRef, padding } = this;
        const { className, children } = this.props;
        const { height, width } = this.state;

        return (
            <div className={styles.outerBorder} ref={divRef} style={{ cursor, height, ...padding, width }}>
                <div className={classNames(className, styles.innerChildren)}>
                    {children}
                </div>
            </div>
        );
    }

    // Middle step: Track cursor and update width and height to animate the transition
    public onMouseMove(event: MouseEvent) {
        if (this.state.userResizeOriginX) {
            this.updateWidth(event.clientX);
        }
        if (this.state.userResizeOriginY) {
            this.updateHeight(event.clientY);
        }
    }

    // Initial step: Begin tracking cursor if it is on a border we are resizing from
    private onMouseDown = (event: MouseEvent) => {
        // Not preventing default causes HTML default drag and drop interaction 10% of the time - Sean M 7/25/19
        event.preventDefault();
        if (!event.target) {
            return;
        }
        const { clientX, clientY } = event;
        const { clientWidth, clientLeft, clientHeight, clientTop } = event.target as HTMLDivElement;

        const onLeftBorder = Math.abs(clientLeft - clientX) <= this.borderSizeInPixels;
        const onRightBorder = Math.abs((clientWidth + clientLeft) - clientX) <= this.borderSizeInPixels;
        const onTopBorder = Math.abs(clientTop - clientY) <= this.borderSizeInPixels;
        const onBottomBorder = Math.abs((clientHeight + clientTop) - clientY) <= this.borderSizeInPixels;

        if ((this.props.left && onLeftBorder) || (this.props.right && onRightBorder)) {
            this.setState({ userResizeOriginX: event.clientX });
        }
        if ((this.props.top && onTopBorder) || (this.props.bottom && onBottomBorder)) {
            this.setState({ userResizeOriginY: event.clientY });
        }
    }

    private updateWidth = (xPos: number) => {
        const locationDelta = this.state.userResizeOriginX! - xPos;
        const width = this.state.width! - locationDelta;
        if (width > this.minimumWidth) {
            this.setState({ userResizeOriginX: xPos, width });
        }
    }

    private updateHeight = (yPos: number) => {
        const locationDelta = this.state.userResizeOriginY! - yPos;
        const height = this.state.height! - locationDelta;
        if (height > this.minimumHeight) {
            this.setState({ userResizeOriginY: yPos, height });
        }
    }

    // Final step: Update state to prevent further resizing
    private onMouseUp = () => {
        if (this.state.userResizeOriginX) {
            this.setState({ userResizeOriginX: undefined });
        }
        if (this.state.userResizeOriginY) {
            this.setState({ userResizeOriginY: undefined });
        }
    }

    // Depending on how we are resizing the cursor needs to be different
    private determineCursor = () => {
        const horizontal = this.props.left || this.props.right;
        const vertical = this.props.bottom || this.props.top;
        if (horizontal && vertical) {
            return "all-scroll";
        }
        if (horizontal) {
            return "col-resize";
        }
        return "row-resize"; // default to vertical
    }
}

export default Resizable;
