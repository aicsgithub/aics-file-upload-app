import { expect } from "chai";
import {
  createSandbox,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import { FileManagementSystem } from "../../../services/aicsfiles";
import { mockJob } from "../../../services/aicsfiles/test/mocks";
import JobStatusClient from "../../../services/job-status-client";
import { JSSJob } from "../../../services/job-status-client/types";
import {
  setErrorAlert,
  setInfoAlert,
  setSuccessAlert,
} from "../../feedback/actions";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
  ReduxLogicDependencies,
} from "../../test/configure-mock-store";
import { mockState, mockWaitingUploadJob } from "../../test/mocks";
import {
  cancelUpload,
  cancelUploadFailed,
  cancelUploadSucceeded,
} from "../../upload/actions";
import { CANCEL_UPLOAD } from "../../upload/constants";
import { cancelUploadLogic } from "../../upload/logics";
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
  describe("cancelUpload", () => {
    it("sets alert if job is not defined", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      store.dispatch({
        payload: {},
        type: CANCEL_UPLOAD,
      });
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          setErrorAlert("Cannot cancel undefined upload job")
        )
      ).to.be.true;
    });
    it("shows dialog and allows user to cancel if they change their mind", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 0 }); // cancel button

      store.dispatch(cancelUpload({ ...mockJob, key: "key" }));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.list).to.deep.equal([{ type: "ignore" }]);
    });
    it("shows dialog and allows user to continue and dispatches cancelUploadSucceeded if cancelling the upload succeeded", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const job = { ...mockJob, key: "key" };

      store.dispatch(cancelUpload(job));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.includesMatch(cancelUpload(job))).to.be.true;
      expect(actions.includesMatch(cancelUploadSucceeded(job))).to.be.true;
    });
    it("dispatches cancelUploadFailed if cancelling the upload failed", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const job = { ...mockJob, key: "key" };
      fms.failUpload.rejects(new Error("foo"));

      store.dispatch(cancelUpload(job));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.includesMatch(cancelUpload(job))).to.be.true;
      expect(
        actions.includesMatch(
          cancelUploadFailed(job, `Cancel upload ${job.jobName} failed: foo`)
        )
      ).to.be.true;
    });
  });
});
