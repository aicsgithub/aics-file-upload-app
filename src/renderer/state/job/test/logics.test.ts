import { expect } from "chai";
import { createSandbox, SinonStubbedInstance, createStubInstance } from "sinon";

import { FileManagementSystem } from "../../../services/aicsfiles";
import JobStatusClient from "../../../services/job-status-client";
import { JSSJob } from "../../../services/job-status-client/types";
import {
  setErrorAlert,
  setInfoAlert,
  setSuccessAlert,
} from "../../feedback/actions";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
  ReduxLogicDependencies,
} from "../../test/configure-mock-store";
import { mockState, mockWaitingUploadJob } from "../../test/mocks";
import { handleAbandonedJobs } from "../actions";
import { handleAbandonedJobsLogic } from "../logics";

describe("Job logics", () => {
  const sandbox = createSandbox();
  let jssClient: SinonStubbedInstance<JobStatusClient>;
  let fms: SinonStubbedInstance<FileManagementSystem>;

  beforeEach(() => {
    jssClient = createStubInstance(JobStatusClient);
    fms = createStubInstance(FileManagementSystem);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("handleAbandonedJobsLogic", () => {
    let logicDeps: ReduxLogicDependencies;

    it("does not find any abandoned jobs", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      jssClient.getJobs.onFirstCall().resolves([]);

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([handleAbandonedJobs()]);
      expect(jssClient.getJobs).to.have.been.calledOnce;
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

      jssClient.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([]);

      fms.failUpload.onFirstCall().resolves([abandonedJob]);
      fms.retryUpload.resolves();

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
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

      jssClient.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([childJob]);

      fms.failUpload.onFirstCall().resolves([abandonedJob]);

      fms.retryUpload.resolves();

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
    });

    it("encounters an error while querying", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      jssClient.getJobs
        .onFirstCall()
        .rejects(new Error("Error while querying"));

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        setErrorAlert("Could not retry abandoned jobs: Error while querying"),
      ]);
      expect(jssClient.getJobs).to.have.been.calledOnce;
    });

    it("dispatches setErrorAlert if fms.retryUpload fails", async () => {
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

      jssClient.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([]);

      fms.failUpload.onFirstCall().resolves([abandonedJob]);
      fms.retryUpload.rejects(new Error("Error in worker"));

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setErrorAlert(
          'Retry for upload "abandoned_job" failed: Error in worker'
        ),
      ]);
    });
  });
});
