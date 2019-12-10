import { Button, Icon } from "antd";
import * as React from "react";

const styles = require("./styles.pcss");

interface SearchButtonProps {
    disabled: boolean;
    loading: boolean;
    onSearch: () => void;
}

const SearchButton: React.FunctionComponent<SearchButtonProps> = ({
                                                                      disabled,
                                                                      loading,
                                                                      onSearch,
                                                                  }) => (
    <Button
        loading={loading}
        disabled={disabled}
        size="large"
        type="primary"
        onClick={onSearch}
        className={styles.searchButton}
    ><Icon type="search" /> Search
    </Button>
);

export default SearchButton;
