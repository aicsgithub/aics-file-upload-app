import { Icon, Select, Spin } from "antd";
import * as classNames from "classnames";
import { ReactNode } from "react";
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
    optionsForLookup?: any[];
    optionsForLookupLoading: boolean;
}

interface OwnProps {
    className?: string;
    // this provides a way for options to be objects and to specify how to display each option
    getDisplayFromOption?: (option: any) => string;
    lookupAnnotationName: string;
    mode?: "multiple" | "default";
    onBlur?: () => void;
    placeholder?: string;
    selectSearchValue: (searchValue?: string) => void;
    value?: string;
}

interface DispatchProps {
    clearOptionsForLookup: ActionCreator<ClearOptionsForLookupAction>;
    retrieveOptionsForLookup: ActionCreator<GetOptionsForLookupAction>;
}

type Props = StateProps & OwnProps & DispatchProps;

/**
 * This component is a dropdown for labkey tables that are considered to be "Lookups".
 * The dropdown values are automatically loaded if it does not come from a large lookup table (see LARGE_LOOKUPS below).
 * Otherwise, the user will need to provide a search value to get dropdown options.
 */
class LookupSearch extends React.Component<Props, { searchValue?: string }> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            searchValue: undefined,
        };
    }

    public componentDidMount(): void {
        const { isLargeLookup, lookupAnnotationName } = this.props;
        if (!isLargeLookup) {
            this.props.retrieveOptionsForLookup(lookupAnnotationName, undefined, false);
        }
    }

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
            lookupAnnotationName,
            mode,
            onBlur,
            optionsForLookupLoading,
            placeholder,
            selectSearchValue,
            value,
        } = this.props;

        const optionsForLookup = this.props.optionsForLookup || [];
        let notFoundContent: ReactNode = "No Results Found";
        if (optionsForLookupLoading) {
            notFoundContent = <Spin size="large"/>;
        } else if (isLargeLookup && !this.state.searchValue) {
            notFoundContent = `Start typing to search for a ${lookupAnnotationName}`;
        }

        return (
            <Select
                allowClear={true}
                autoFocus={true}
                className={classNames(styles.container, {[styles.search]: isLargeLookup}, className)}
                defaultActiveFirstOption={false}
                loading={optionsForLookupLoading}
                mode={mode}
                notFoundContent={notFoundContent}
                onBlur={onBlur}
                onChange={selectSearchValue}
                onSearch={this.onSearch}
                placeholder={placeholder}
                showSearch={true}
                suffixIcon={isLargeLookup ? <Icon type="search"/> : undefined}
                value={value}
            >
                {optionsForLookup.map((option) => {
                    const display = this.getDisplayFromOption(option);
                    return <Select.Option key={display} value={display}>{display}</Select.Option>;
                })}
            </Select>
        );
    }

    private onSearch = (searchValue?: string): void => {
        const { lookupAnnotationName } = this.props;
        this.setState({ searchValue });
        if (searchValue) {
            this.props.retrieveOptionsForLookup(lookupAnnotationName, searchValue, false);
        } else {
            this.props.clearOptionsForLookup(lookupAnnotationName);
        }
    }

    private getDisplayFromOption = (option: any): string => {
        const { getDisplayFromOption } = this.props;
        if (getDisplayFromOption) {
            return getDisplayFromOption(option);
        }
        return option;
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
