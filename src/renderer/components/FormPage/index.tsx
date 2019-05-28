import { Button, Icon, Spin } from "antd";
import * as classNames from "classnames";
import * as React from "react";

const styles = require("./style.pcss");

interface FormPageProps {
    backButtonDisabled?: boolean;
    children: JSX.Element | Array<JSX.Element | null>;
    className?: string;
    formTitle: string;
    formPrompt: string;
    saveButtonName?: string;
    saveButtonDisabled?: boolean;
    saveInProgress?: boolean;
    onSave?: () => any;
    backButtonName?: string;
    onBack?: () => any;
}

class FormPage extends React.Component<FormPageProps, {}> {
    public static defaultProps = {
        backButtonDisabled: false,
        backButtonName: "Back",
        saveButtonDisabled: false,
        saveButtonName: "Next",
        saveInProgress: false,
    };

    private static renderSpinner(saveInProgress: boolean = false) {
        const indicator = <Icon type="loading" className={styles.loading} spin={true} />;
        return saveInProgress && <Spin indicator={indicator}/>;
    }

    constructor(props: FormPageProps) {
        super(props);
        this.state = {};
        this.onSave = this.onSave.bind(this);
        this.onBack = this.onBack.bind(this);
    }

    public render() {
        const {
            backButtonDisabled,
            backButtonName,
            children,
            className,
            formPrompt,
            formTitle,
            onSave,
            onBack,
            saveInProgress,
            saveButtonDisabled,
            saveButtonName,
        } = this.props;
        const {} = this.state;

        return (
            <div className={classNames(className, styles.container)}>
                <div className={styles.content}>
                    <div className={styles.title}>{formTitle}</div>
                    <div className={styles.formPrompt}>
                        {formPrompt}
                    </div>
                    <div className={styles.form}>
                        {children}
                    </div>
                </div>
                <div className={styles.buttonContainer}>
                    {onBack ? <Button
                        size="large"
                        onClick={this.onBack}
                        disabled={backButtonDisabled}
                    >
                        {backButtonName}
                    </Button> : <div/>}
                    {onSave ? <Button
                        type="primary"
                        size="large"
                        onClick={this.onSave}
                        disabled={saveButtonDisabled}
                    >
                        {saveInProgress ? "Loading" : saveButtonName}
                        {FormPage.renderSpinner(saveInProgress)}
                    </Button> : <div/>}
                </div>
            </div>
        );
    }

    private onSave(): void {
        if (this.props.onSave) {
            this.props.onSave();
        }
    }

    private onBack(): void {
        if (this.props.onBack) {
            this.props.onBack();
        }
    }
}

export default FormPage;
