import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import { JOB_STORAGE_KEY } from "../../../../shared/constants";
import { ADD_EVENT, SET_ALERT } from "../../feedback/constants";
import { logger } from "../../test/configure-mock-store";
import {
  mockSuccessfulAddMetadataJob,
  mockSuccessfulCopyJob,
  mockSuccessfulUploadJob,
} from "../../test/mocks";
import { AlertType } from "../../types";
import { getActionFromBatch } from "../../util";
import { RECEIVE_JOBS } from "../constants";
import { mapJobsToActions } from "../logics";

describe("Job logics", () => {
  const sandbox = createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("mapJobsToActions", () => {
    const addMetadataJobs = [mockSuccessfulAddMetadataJob];
    const copyJobs = [mockSuccessfulCopyJob];
    const uploadJobs = [mockSuccessfulUploadJob];
    const recentlyFailedJobNames = ["jobName"];
    const recentlySucceededJobNames = ["jobName2"];
    const storage = {
      clear: stub(),
      delete: stub(),
      get: stub().returns(["abc"]),
      has: stub(),
      set: stub(),
    };

    it("Sets error if error is present", () => {
      const actions = mapJobsToActions(
        storage,
        logger
      )({ error: new Error("boo") });
      const addEventAction = getActionFromBatch(actions, ADD_EVENT);
      expect(addEventAction).to.not.be.undefined;
      expect(addEventAction?.payload.type).to.equal(AlertType.ERROR);
      expect(addEventAction?.payload.message).to.equal(
        "Could not retrieve jobs: boo"
      );
    });

    it("Sets jobs passed in", () => {
      const actualIncompleteJobIds = ["imActuallyIncomplete"];
      const actions = mapJobsToActions(
        storage,
        logger
      )({
        actualIncompleteJobIds,
        addMetadataJobs,
        copyJobs,
        recentlyFailedJobNames,
        recentlySucceededJobNames,
        uploadJobs,
      });
      const receiveJobsAction = getActionFromBatch(actions, RECEIVE_JOBS);

      expect(receiveJobsAction).to.deep.equal({
        payload: {
          addMetadataJobs,
          copyJobs,
          inProgressUploadJobs: [],
          incompleteJobIds: actualIncompleteJobIds,
          uploadJobs,
        },
        type: RECEIVE_JOBS,
      });
    });

    it("Sends alert for successful upload job given incomplete job", () => {
      const actions = mapJobsToActions(
        storage,
        logger
      )({
        actualIncompleteJobIds: [],
        addMetadataJobs,
        copyJobs,
        recentlySucceededJobNames: ["mockJob1"],
        uploadJobs,
      });

      const receivedJobsAction = getActionFromBatch(actions, RECEIVE_JOBS);
      expect(receivedJobsAction).to.not.be.undefined;
      expect(receivedJobsAction?.payload.incompleteJobIds).to.be.empty;

      const setAlertAction = getActionFromBatch(actions, SET_ALERT);
      expect(setAlertAction).to.not.be.undefined;
      expect(actions.updates).to.not.be.undefined;
      expect(
        actions?.updates[`${JOB_STORAGE_KEY}.incompleteJobIds`]
      ).to.deep.equal([]);
      if (setAlertAction) {
        expect(setAlertAction.payload.type).to.equal(AlertType.SUCCESS);
        expect(setAlertAction.payload.message).to.equal("mockJob1 Succeeded");
      }
    });

    it("Sends alert for failed upload job given incomplete job", () => {
      const setStub = stub();
      sandbox.replace(storage, "set", setStub);
      const actions = mapJobsToActions(
        storage,
        logger
      )({
        actualIncompleteJobIds: [],
        addMetadataJobs,
        copyJobs,
        recentlyFailedJobNames: ["mockFailedUploadJob"],
        uploadJobs,
      });

      const receiveJobsAction = getActionFromBatch(actions, RECEIVE_JOBS);
      expect(receiveJobsAction).to.not.be.undefined;
      expect(receiveJobsAction?.payload.incompleteJobIds).to.be.empty;

      const setAlertAction = getActionFromBatch(actions, SET_ALERT);
      expect(setAlertAction).to.not.be.undefined;
      expect(setStub.calledWith(`${JOB_STORAGE_KEY}.incompleteJobIds`, [])).to
        .be.true;
      if (setAlertAction) {
        expect(setAlertAction.payload.type).to.equal(AlertType.ERROR);
        expect(setAlertAction.payload.message).to.equal(
          "mockFailedUploadJob Failed"
        );
      }
    });
  });
});
