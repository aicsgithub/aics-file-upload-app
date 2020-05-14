import { Button, Icon, Spin } from "antd";
import * as classNames from "classnames";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

import { Page } from "../../state/route/types";

import ProgressBar from "../ProgressBar";

const styles = require("./style.pcss");

interface FormPageProps {
  backButtonDisabled?: boolean;
  children: ReactNode | ReactNodeArray;
  className?: string;
  formTitle: string;
  formPrompt: string;
  saveButtonName?: string;
  saveButtonDisabled?: boolean;
  saveInProgress?: boolean;
  onSave: () => any;
  backButtonName?: string;
  onBack: () => any;
  page: Page;
}

/**
 * This adds common components to the "pages" of the app.
 */
class FormPage extends React.Component<FormPageProps, {}> {
  public static defaultProps = {
    backButtonDisabled: false,
    backButtonName: "Back",
    saveButtonDisabled: false,
    saveButtonName: "Next",
    saveInProgress: false,
  };

  private static renderSpinner(saveInProgress = false) {
    const indicator = (
      <Icon type="loading" className={styles.loading} spin={true} />
    );
    return saveInProgress && <Spin indicator={indicator} />;
  }

  constructor(props: FormPageProps) {
    super(props);
    this.state = {};
  }

  public render() {
    const {
      backButtonDisabled,
      backButtonName,
      children,
      className,
      formPrompt,
      formTitle,
      page,
      saveInProgress,
      saveButtonDisabled,
      saveButtonName,
    } = this.props;

    return (
      <div className={classNames(styles.container, className)}>
        <ProgressBar className={styles.progressBar} page={page} />
        <div className={styles.content}>
          <div className={styles.title}>{formTitle}</div>
          <div className={styles.formPrompt}>{formPrompt}</div>
          <div className={styles.form}>{children}</div>
        </div>
        <div className={styles.buttons}>
          <Button
            className={styles.backButton}
            size="large"
            type="link"
            onClick={this.onBack}
            disabled={backButtonDisabled}
          >
            {backButtonName}
          </Button>
          <Button
            className={styles.saveButton}
            type="primary"
            size="large"
            onClick={this.onSave}
            disabled={saveButtonDisabled || saveInProgress}
          >
            {saveInProgress ? "Loading" : saveButtonName}
            {FormPage.renderSpinner(saveInProgress)}
          </Button>
        </div>
      </div>
    );
  }

  private onSave = (): void => {
    if (this.props.onSave) {
      this.props.onSave();
    }
  };

  private onBack = (): void => {
    if (this.props.onBack) {
      this.props.onBack();
    }
  };
}

export default FormPage;
