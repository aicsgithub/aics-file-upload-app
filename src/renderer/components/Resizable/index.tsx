import * as React from "react";


interface ResizableProps {
    height?: number;
    horizontal?: boolean;
    vertical?: boolean;
    width?: number
}

interface ResizableState {
    height?: number;
    userResizeOriginX?: number;
    userResizeOriginY?: number;
    width?: number;
}


class Resizable extends React.Component<ResizableProps, ResizableState> {
    private divRef: HTMLDivElement | null;

    constructor(props: ResizableProps) {
        super(props);
        this.state = {
            height: this.props.height,
            width: this.props.width,
        };

        this.divRef = React.createRef<HTMLDivElement>();
    }

    componentDidMount() {
        this.divRef.addEventListener('mouseup', this.onMouseUp);
        this.divRef.addEventListener('mousedown', this.onMouseDown);
    }

    componentWillUnmount() {
        this.divRef.removeEventListener('mouseup', this.onMouseUp);
        this.divRef.removeEventListener('mousedown', this.onMouseDown);
    }

    public render() {
        //  TODO: add cursor icon change
        const { height, width } = this.state;

        return (
            <div ref={this.divRef} style={{ height, width }}>
                {this.props.children}
            </div>
        );
    }

    private onMouseDown = (event: MouseEvent) => {
        console.log('start DOWN');
        console.log(event.clientX);
        console.log(event.clientY);
        console.log(event.offsetX);
        console.log(event.offsetY);
        console.log('end DOWN');
        const distanceFromRightBorder = event.currentTarget.offsetWidth - event.clientX;
        console.log(distanceFromRightBorder);
        if (distanceFromRightBorder <= 5 || distanceFromRightBorder >= 5) {
            if (this.props.horizontal && this.props.vertical) {
                this.setState({ userResizeOriginX: event.clientX, userResizeOriginY: event.clientY });
            } else if (this.props.horizontal) {
                this.setState({ userResizeOriginX: event.clientX });
            } else if (this.props.vertical) {
                this.setState({ userResizeOriginY: event.clientY });
            }
        }
    }

    private onMouseUp = (event: MouseEvent) => {
        console.log('start UP');
        console.log(event.clientX);
        console.log(event.clientY);
        console.log(event.offsetX);
        console.log(event.offsetY);
        console.log('end UP');
        if (this.state.userResizeOriginX && this.state.width) {
            const locationDelta = event.clientX - this.state.userResizeOriginX;
            const width = this.state.width - locationDelta;
            this.setState({ userResizeOriginX: undefined, width });
        }
        if (this.state.userResizeOriginY && this.state.height) {
            const locationDelta = event.clientY - this.state.userResizeOriginY;
            const height = this.state.height - locationDelta;
            this.setState({ userResizeOriginY: undefined, height });
        }
    }
}

export default Resizable;
