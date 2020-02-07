import { Icon, Select, Spin } from "antd";
import * as classNames from "classnames";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import { AsyncRequest } from "../../state/feedback/types";
import { clearOptionsForLookup, retrieveOptionsForLookup } from "../../state/metadata/actions";
import { getMetadata } from "../../state/metadata/selectors";
import { ClearOptionsForLookupAction, GetOptionsForLookupAction } from "../../state/metadata/types";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface StateProps {
    isLargeLookup: boolean;
    optionsForLookup?: string[];
    optionsForLookupLoading: boolean;
}

interface OwnProps {
    className?: string;
    lookupAnnotationName: string;
    placeholder?: string;
    selectSearchValue: (searchValue?: string) => void;
    value?: string;
}

interface DispatchProps {
    clearOptionsForLookup: ActionCreator<ClearOptionsForLookupAction>;
    retrieveOptionsForLookup: ActionCreator<GetOptionsForLookupAction>;
}

type Props = StateProps & OwnProps & DispatchProps;

class LookupSearch extends React.Component<Props, {}> {

    public componentDidUpdate(prevProps: Props): void {
        const { isLargeLookup, lookupAnnotationName } = this.props;
        if (!isLargeLookup && prevProps.lookupAnnotationName !== this.props.lookupAnnotationName) {
            this.props.retrieveOptionsForLookup(lookupAnnotationName, undefined, false);
        }
    }

    public render() {
        const {
            className,
            isLargeLookup,
            optionsForLookupLoading,
            placeholder,
            selectSearchValue,
            value,
        } = this.props;

        const optionsForLookup = this.props.optionsForLookup || [];

        return (
            <Select
                allowClear={true}
                autoClearSearchValue={true}
                autoFocus={true}
                className={classNames(styles.container, className)}
                defaultOpen={true}
                defaultActiveFirstOption={false}
                value={value}
                loading={optionsForLookupLoading}
                notFoundContent={optionsForLookupLoading ? <Spin size="large" /> : "No Results Found"}
                onChange={selectSearchValue}
                onSearch={this.onSearch}
                placeholder={placeholder || "Select Search Value"}
                showArrow={!isLargeLookup}
                showSearch={isLargeLookup}
                suffixIcon={<Icon type="search"/>}
            >
                {optionsForLookup.map((option) => (
                    <Select.Option key={option} value={option}>{option}</Select.Option>
                ))}
            </Select>
        );
    }

    private onSearch = (search?: string): void => {
        if (search) {
            this.props.retrieveOptionsForLookup(this.props.lookupAnnotationName, search, false);
        } else {
            this.props.clearOptionsForLookup();
        }
    }
}

const LARGE_LOOKUPS: readonly string[] = Object.freeze(["vial"]);
function mapStateToProps(state: State, {
    className,
    lookupAnnotationName,
    placeholder,
    selectSearchValue,
}: OwnProps) {
    return {
        className,
        isLargeLookup: LARGE_LOOKUPS.includes(lookupAnnotationName.toLowerCase()),
        lookupAnnotationName,
        optionsForLookup: getMetadata(state)[lookupAnnotationName],
        optionsForLookupLoading: getRequestsInProgressContains(state, AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
        placeholder,
        selectSearchValue,
    };
}

const dispatchToPropsMap = {
    clearOptionsForLookup,
    retrieveOptionsForLookup,
};

export default connect(mapStateToProps, dispatchToPropsMap)(LookupSearch);
