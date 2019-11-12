import { Icon, Tooltip } from "antd";
import * as classNames from "classnames";
import { MenuItem, MenuItemConstructorOptions, remote } from "electron";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    children: ReactNode | ReactNodeArray;
    className?: string;
    error?: string;
    template?: Array<MenuItemConstructorOptions | MenuItem>;
}

class CellWithContextMenu extends React.Component<Props, {}> {
    private readonly cellRef = React.createRef<HTMLDivElement>();

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    public componentDidMount() {
        this.cellRef.current!.addEventListener("contextmenu", this.replaceContextMenu, false);
    }

    public render() {
        const {
            children,
            className,
            error,
        } = this.props;
        return (
            <div className={classNames(styles.container, {[styles.error]: error}, className)} ref={this.cellRef}>
                <div className={styles.main}>
                    {children}
                </div>
                {error && <Tooltip title={error} className={styles.errorIcon} >
                <Icon type="close-circle" theme="filled" />
            </Tooltip>}
            </div>
        );
    }

    // Replaces right-click menu on 'contextmenu' events with an Electron menu
    private replaceContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        if (this.props.template) {
            const menu = remote.Menu.buildFromTemplate(this.props.template);
            menu.popup();
        }
    }
}

export default CellWithContextMenu;
