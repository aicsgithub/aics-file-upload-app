import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { Provider } from "react-redux";

import UploadSummary from "..";
import { viewUploads } from "../../../state/route/actions";
import { createMockReduxStore } from "../../../state/test/configure-mock-store";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWorkingUploadJob,
  nonEmptyStateForInitiatingUpload,
} from "../../../state/test/mocks";
import { AsyncRequest } from "../../../state/types";
import { cancelUploads, retryUploads } from "../../../state/upload/actions";

describe.only("<UploadSummary />", () => {
  it("renders spinner while loading data", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...mockState,
    feedback: {
      ...mockState.feedback,
      requestsInProgress: [AsyncRequest.GET_JOBS]
    } });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // Assert
    expect(wrapper.find("i.ant-spin-dot-item").exists()).to.be.true;
  });

  it("disables view button when no uploads are selected", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...nonEmptyStateForInitiatingUpload,
      job: {
        ...nonEmptyStateForInitiatingUpload.job,
        uploadJobs: [mockSuccessfulUploadJob, mockFailedUploadJob],
      },});

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // Assert
    let button = wrapper
      .findWhere((node) => node.text() === "View")
      .first()
      .find("button");
    expect(button.prop("disabled")).to.be.true;
  });

  it("disables retry button when no uploads are selected", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...nonEmptyStateForInitiatingUpload,
      job: {
        ...nonEmptyStateForInitiatingUpload.job,
        uploadJobs: [mockSuccessfulUploadJob, mockFailedUploadJob],
      },});

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // Assert
    let button = wrapper
      .findWhere((node) => node.text() === "Retry")
      .first()
      .find("button");
    expect(button.prop("disabled")).to.be.true;
  });

  it("disables cancel button when no uploads are selected", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...nonEmptyStateForInitiatingUpload,
      job: {
        ...nonEmptyStateForInitiatingUpload.job,
        uploadJobs: [mockSuccessfulUploadJob, mockFailedUploadJob],
      },});

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // Assert
    let button = wrapper
      .findWhere((node) => node.text() === "Cancel")
      .first()
      .find("button");
    expect(button.prop("disabled")).to.be.true;
  });

  it("allows view when no uploads are selected", async () => {
    // Arrange
    const { store, actions, logicMiddleware } = createMockReduxStore({ ...nonEmptyStateForInitiatingUpload,
      job: {
        ...nonEmptyStateForInitiatingUpload.job,
        uploadJobs: [mockSuccessfulUploadJob],
      },});

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // (sanity-check) button is disabled before selection
    let viewButton = wrapper
      .findWhere((node) => node.text() === "View")
      .first()
      .find("button");
    expect(viewButton.prop("disabled")).to.be.true;

    // Select upload
    wrapper.find("input.ant-checkbox-input").at(0).simulate("click");
    await logicMiddleware.whenComplete();

    // Click button
    wrapper = wrapper.update();
    viewButton = wrapper
      .findWhere((node) => node.text() === "View")
      .first()
      .find("button");
    // expect(viewButton.debug()).to.be.true;
    expect(viewButton.prop("disabled")).to.be.false;
    viewButton.simulate("click");

    // Assert
    expect(actions.includesMatch(viewUploads([mockFailedUploadJob]))).to.be
      .true;
  });

  it("allows retry when all selected uploads are failed", () => {
    // Arrange
    const state = {
      ...mockState,
      job: {
        ...mockState.job,
        uploadJobs: [mockFailedUploadJob],
      },
    };
    const { actions, store } = createMockReduxStore(state);

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // (sanity-check) button is disabled
    const retryButton = wrapper
      .findWhere((node) => node.text() === "Retry")
      .first()
      .find("button");
    expect(retryButton.prop("disabled")).to.be.true;

    // Select upload
    wrapper.find("input.ant-checkbox-input").at(1).simulate("click");

    // Submit retry
    wrapper
      .findWhere((node) => node.text() === "Retry")
      .first()
      .simulate("click");

    // Assert
    expect(actions.includesMatch(retryUploads([mockFailedUploadJob]))).to.be
      .true;
  });

  it("allows cancel when all selected uploads are in progress", () => {
    // Arrange
    const state = {
      ...mockState,
      job: {
        ...mockState.job,
        uploadJobs: [mockWorkingUploadJob],
      },
    };
    const { actions, store } = createMockReduxStore(state);

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <UploadSummary />
      </Provider>
    );

    // (sanity-check) button is disabled
    const cancelButton = wrapper
      .findWhere((node) => node.text() === "Cancel")
      .first()
      .find("button");
    expect(cancelButton.prop("disabled")).to.be.true;

    // Select upload
    wrapper.find("input.ant-checkbox-input").at(1).simulate("click");

    // Submit cancel
    wrapper
      .findWhere((node) => node.text() === "Cancel")
      .first()
      .simulate("click");

    // Assert
    expect(actions.includesMatch(cancelUploads([mockWorkingUploadJob]))).to.be
      .true;
  });
});

