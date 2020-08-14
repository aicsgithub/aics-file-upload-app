import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { expect } from "chai";
import {
  createSandbox,
  createStubInstance,
  SinonStubbedInstance,
  stub,
} from "sinon";

import { JOB_STORAGE_KEY } from "../../../../shared/constants";
import { UPLOAD_WORKER_SUCCEEDED } from "../../constants";
import {
  setErrorAlert,
  setInfoAlert,
  setSuccessAlert,
} from "../../feedback/actions";
import { SET_ALERT } from "../../feedback/constants";
import {
  createMockReduxStore,
  logger,
  mockReduxLogicDeps,
  ReduxLogicDependencies,
} from "../../test/configure-mock-store";
import {
  mockState,
  mockSuccessfulAddMetadataJob,
  mockSuccessfulCopyJob,
  mockSuccessfulUploadJob,
  mockWaitingUploadJob,
} from "../../test/mocks";
import { AlertType } from "../../types";
import { getActionFromBatch } from "../../util";
import {
  handleAbandonedJobs,
  retrieveJobsFailed,
  startJobPoll,
} from "../actions";
import { RECEIVE_JOBS } from "../constants";
import { mapJobsToActions, handleAbandonedJobsLogic } from "../logics";

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

    it("Returns retrieveJobsFailed if error is present", () => {
      const action = mapJobsToActions(
        storage,
        logger
      )({ error: new Error("boo") });
      expect(action).to.deep.equal(
        retrieveJobsFailed("Could not retrieve jobs: boo")
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

  describe("handleAbandonedJobsLogic", () => {
    let jssStub: SinonStubbedInstance<JobStatusClient>;
    let fmsStub: SinonStubbedInstance<FileManagementSystem>;
    let workerStub: any;
    let logicDeps: ReduxLogicDependencies;

    beforeEach(() => {
      jssStub = createStubInstance(JobStatusClient);
      fmsStub = createStubInstance(FileManagementSystem);
      // Stub out the getters for the FMS stub
      stub(fmsStub, "host").get(() => "test_host");
      stub(fmsStub, "port").get(() => "test_port");
      stub(fmsStub, "username").get(() => "test_username");
      // `Worker` is not defined in the Node environment where these tests run,
      // so we'll make our own mock.
      workerStub = {
        // `onmessage` and `onerror` will be overwritten in the actual logic
        onmessage: (e: any) => e,
        onerror: (e: any) => e,
        postMessage: stub(),
      };

      logicDeps = {
        ...mockReduxLogicDeps,
        // Assert that the stubs are of the correct types
        jssClient: (jssStub as unknown) as JobStatusClient,
        fms: (fmsStub as unknown) as FileManagementSystem,
        getRetryUploadWorker: stub().returns(workerStub),
      };
    });

    it("does not find any abandoned jobs", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      jssStub.getJobs.onFirstCall().resolves([]);

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([handleAbandonedJobs()]);
      expect(jssStub.getJobs).to.have.been.calledOnce;
    });

    it("finds and retries one abandoned job with no children", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      const abandonedJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        serviceFields: {
          files: [{ file: { originalPath: "test_path" } }],
        },
      };

      jssStub.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([]);

      fmsStub.failUpload.onFirstCall().resolves([abandonedJob]);

      workerStub.postMessage
        .onFirstCall()
        .callsFake(() =>
          workerStub.onmessage({ data: UPLOAD_WORKER_SUCCEEDED })
        );

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        startJobPoll(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
      expect(workerStub.postMessage).to.have.been.calledOnce;
    });

    it("finds and retries one abandoned job with children", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      const abandonedJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        childIds: ["child_job_id"],
        serviceFields: {
          files: [{ file: { originalPath: "test_path" } }],
        },
      };
      const childJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "child_job_id",
        jobName: "child_job",
        parentId: "abandoned_job_id",
      };

      jssStub.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([childJob]);

      fmsStub.failUpload.onFirstCall().resolves([abandonedJob]);

      workerStub.postMessage
        .onFirstCall()
        .callsFake(() =>
          workerStub.onmessage({ data: UPLOAD_WORKER_SUCCEEDED })
        );

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        startJobPoll(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
      expect(workerStub.postMessage).to.have.been.calledOnce;
    });

    it("encounters an error while querying", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      jssStub.getJobs.onFirstCall().rejects(new Error("Error while querying"));

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        setErrorAlert("Could not retry abandoned jobs: Error while querying"),
      ]);
      expect(jssStub.getJobs).to.have.been.calledOnce;
    });

    it("encounters an error in the worker", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      const abandonedJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        serviceFields: {
          files: [{ file: { originalPath: "test_path" } }],
        },
      };

      jssStub.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([]);

      fmsStub.failUpload.onFirstCall().resolves([abandonedJob]);

      workerStub.postMessage
        .onFirstCall()
        .callsFake(() => workerStub.onerror({ message: "Error in worker" }));

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        startJobPoll(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setErrorAlert(
          'Retry for upload "abandoned_job" failed: Error in worker'
        ),
      ]);
      expect(workerStub.postMessage).to.have.been.calledOnce;
    });
  });
});
