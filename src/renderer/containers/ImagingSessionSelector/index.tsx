import { Radio } from "antd";
import { RadioChangeEvent } from "antd/lib/radio";
import { get } from "lodash";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import LabeledInput from "../../components/LabeledInput";
import { getImagingSessions } from "../../state/metadata/selectors";
import { ImagingSession } from "../../state/metadata/types";
import { selectImagingSessionId } from "../../state/selection/actions";
import {
  getSelectedImagingSessionId,
  getSelectedImagingSessionIds,
} from "../../state/selection/selectors";
import { SelectImagingSessionIdAction } from "../../state/selection/types";
import { State } from "../../state/types";

interface ImagingSessionSelectorProps {
  className?: string;
  imagingSessionIds: Array<number | null>;
  imagingSessions: ImagingSession[];
  selectImagingSessionId: ActionCreator<SelectImagingSessionIdAction>;
  selectedImagingSessionId?: number;
}

/**
 * This selector displays all of the imaging sessions for a plate barcode and allows
 * users to toggle the imaging session to view
 */
class ImagingSessionSelector extends React.Component<
  ImagingSessionSelectorProps,
  {}
> {
  public render() {
    const {
      className,
      selectedImagingSessionId,
      imagingSessionIds,
    } = this.props;
    if (imagingSessionIds.length < 2) {
      return null;
    }

    return (
      <LabeledInput label="Imaging Session" className={className}>
        <Radio.Group
          buttonStyle="solid"
          value={selectedImagingSessionId || 0}
          onChange={this.selectImagingSession}
        >
          {imagingSessionIds.map((id) => (
            <Radio.Button value={id || 0} key={id || 0}>
              {this.getImagingSessionName(id)}
            </Radio.Button>
          ))}
        </Radio.Group>
      </LabeledInput>
    );
  }

  private getImagingSessionName = (id?: number | null) => {
    if (id == null) {
      return "None";
    }

    const matchingImagingSession = this.props.imagingSessions.find(
      (i) => i.imagingSessionId === id
    );
    return get(matchingImagingSession, ["name"], `Imaging Session Id: ${id}`);
  };

  private selectImagingSession = (e: RadioChangeEvent) => {
    this.props.selectImagingSessionId(e.target.value);
  };
}

function mapStateToProps(state: State) {
  return {
    imagingSessionIds: getSelectedImagingSessionIds(state),
    imagingSessions: getImagingSessions(state),
    selectedImagingSessionId: getSelectedImagingSessionId(state),
  };
}

const dispatchToPropsMap = {
  selectImagingSessionId,
};

export default connect(
  mapStateToProps,
  dispatchToPropsMap
)(ImagingSessionSelector);
