import { expect } from "chai";
import { mount } from "enzyme";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";

import UploadTable from "..";
import { createMockReduxStore } from "../../../state/test/configure-mock-store";
import { mockState } from "../../../state/test/mocks";
import { UploadSummaryTableRow } from "../../../state/types";

describe("<UploadTable />", () => {
  it("renders empty signifier when no uploads found", () => {
    // Arrange
    const uploads: UploadSummaryTableRow[] = [];
    const title = "My Cool Table";
    const { store } = createMockReduxStore({ ...mockState });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <UploadTable
          uploads={uploads}
          onSelect={noop}
          onContextMenu={noop}
          title={title}
        />
      </Provider>
    );

    // Assert
    expect(wrapper.contains(title)).to.be.true;
    expect(wrapper.find("div.emptyContainer").exists()).to.be.true;
  });
});
