import { Select } from "antd";
import * as classNames from "classnames";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";
import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";

import { retrieveOptionsForLookup } from "../../state/metadata/actions";
import { getMetadata } from "../../state/metadata/selectors";
import { GetOptionsForLookupAction } from "../../state/metadata/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface StateProps {
    optionsForLookup?: string[];
    optionsForLookupLoading: boolean;
}

interface OwnProps {
    className?: string;
    lookupAnnotationName: string;
    placeholder?: string;
    searchValue?: string;
    selectSearchValue: (searchValue?: string) => void;
}

interface DispatchProps {
    retrieveOptionsForLookup: ActionCreator<GetOptionsForLookupAction>;
}

type Props = StateProps & OwnProps & DispatchProps;

class LookupSearch extends React.Component<Props, {}> {
    public render() {
        const {
            className,
            optionsForLookup,
            optionsForLookupLoading,
            placeholder,
            searchValue,
            selectSearchValue,
        } = this.props;

        return (
            <Select
                allowClear={true}
                showSearch={true}
                value={searchValue}
                loading={optionsForLookupLoading}
                disabled={!optionsForLookup || optionsForLookupLoading}
                onChange={selectSearchValue}
                placeholder={placeholder || "Select Search Value"}
                className={classNames(styles.container, className)}
            >
                {optionsForLookup && optionsForLookup.map((option) => (
                    <Select.Option key={option} value={option}>{option}</Select.Option>
                ))}
            </Select>
        );
    }
}

function mapStateToProps(state: State, {
    className,
    lookupAnnotationName,
    placeholder,
    searchValue,
    selectSearchValue,
}: OwnProps) {
    return {
        className,
        lookupAnnotationName,
        optionsForLookup: getMetadata(state)[lookupAnnotationName],
        optionsForLookupLoading: getRequestsInProgressContains(state, AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
        placeholder,
        searchValue,
        selectSearchValue,
    };
}

const dispatchToPropsMap = {
    retrieveOptionsForLookup,
};

export default connect(mapStateToProps, dispatchToPropsMap)(LookupSearch);
