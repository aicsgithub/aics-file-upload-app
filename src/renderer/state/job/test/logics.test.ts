import { expect } from "chai";
import { createSandbox, SinonStubbedInstance, createStubInstance } from "sinon";

import { FileManagementSystem } from "../../../services/aicsfiles";
import {
  StepName,
  UploadServiceFields,
} from "../../../services/aicsfiles/types";
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
import {
  mockFailedAddMetadataJob,
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWaitingUploadJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { State } from "../../types";
import { uploadFailed, uploadSucceeded } from "../../upload/actions";
import { batchActions } from "../../util";
import { receiveJobs, receiveJobUpdate } from "../actions";
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
    let waitingAbandonedJob: JSSJob<UploadServiceFields>;
    let copyFilesAbandonedJob: JSSJob<UploadServiceFields>;
    let copyFileAbandonedJob: JSSJob<UploadServiceFields>;
    let addMetadataAbandonedJob: JSSJob<UploadServiceFields>;
    let inProgressNotAbandonedJob: JSSJob<UploadServiceFields>;

    beforeEach(() => {
      waitingAbandonedJob = {
        ...mockWaitingUploadJob,
        currentStage: StepName.Waiting,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        childIds: ["child_job_id"],
        serviceFields: {
          files: [
            {
              customMetadata: { annotations: [], templateId: 1 },
              file: { fileType: "image", originalPath: "test_path" },
            },
          ],
          type: "upload",
          uploadDirectory: "/test",
        },
      };
      copyFilesAbandonedJob = {
        ...waitingAbandonedJob,
        currentStage: StepName.CopyFiles,
        jobId: "abandoned_job_id2",
        jobName: "abandoned_job2",
      };
      copyFileAbandonedJob = {
        ...waitingAbandonedJob,
        currentStage: StepName.CopyFilesChild,
        jobId: "abandoned_job_id3",
        jobName: "abandoned_job3",
      };
      addMetadataAbandonedJob = {
        ...waitingAbandonedJob,
        currentStage: StepName.AddMetadata,
        jobId: "abandoned_job_id4",
        jobName: "abandoned_job4",
      };
      inProgressNotAbandonedJob = {
        ...mockWorkingUploadJob,
        currentStage: "etl",
      };
    });

    it("does not do anything if no abandoned jobs", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      store.dispatch(
        receiveJobs([mockFailedUploadJob, mockSuccessfulUploadJob])
      );

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([mockFailedUploadJob, mockSuccessfulUploadJob]),
      ]);
      expect(fms.retryUpload).to.not.have.been.called;
    });

    it("finds and retries any job that didn't get past the add metadata step", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);
      const action = receiveJobs([
        mockFailedUploadJob,
        waitingAbandonedJob,
        addMetadataAbandonedJob,
        inProgressNotAbandonedJob,
        copyFileAbandonedJob,
        copyFilesAbandonedJob,
      ]);
      fms.failUpload
        .onFirstCall()
        .resolves([waitingAbandonedJob])
        .onSecondCall()
        .resolves([addMetadataAbandonedJob])
        .onThirdCall()
        .resolves([copyFileAbandonedJob])
        .onCall(3)
        .resolves([copyFilesAbandonedJob]);

      store.dispatch(action);
      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        action,
        setInfoAlert(
          `Upload "${waitingAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
        setInfoAlert(
          `Upload "${addMetadataAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
        setInfoAlert(
          `Upload "${copyFileAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
        setInfoAlert(
          `Upload "${copyFilesAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
        setSuccessAlert(
          `Retry for upload "${waitingAbandonedJob.jobName}" succeeded!`
        ),
        setSuccessAlert(
          `Retry for upload "${addMetadataAbandonedJob.jobName}" succeeded!`
        ),
        setSuccessAlert(
          `Retry for upload "${copyFileAbandonedJob.jobName}" succeeded!`
        ),
        setSuccessAlert(
          `Retry for upload "${copyFilesAbandonedJob.jobName}" succeeded!`
        ),
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

      fms.failUpload.onFirstCall().resolves([waitingAbandonedJob]);

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
    });

    it("sets error alert if an error is thrown", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      fms.failUpload.onFirstCall().rejects(new Error("some error"));

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          `Upload "${waitingAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
        setErrorAlert("Could not retry abandoned jobs: some error"),
      ]);
    });

    it("dispatches setErrorAlert if fms.retryUpload fails", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      fms.failUpload.onFirstCall().resolves([waitingAbandonedJob]);
      fms.retryUpload.rejects(new Error("Error in worker"));

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setErrorAlert(
          'Retry for upload "abandoned_job" failed: Error in worker'
        ),
      ]);
    });
  });
  describe("receiveJobUpdateLogics", () => {
    let mockStateWithNonEmptyUploadJobs: State;
    beforeEach(() => {
      mockStateWithNonEmptyUploadJobs = {
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockWorkingUploadJob],
        },
      };
    });

    it("dispatches no additional actions if the job is not an upload job", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs
      );

      store.dispatch(receiveJobUpdate(mockFailedAddMetadataJob));

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        receiveJobUpdate(mockFailedAddMetadataJob),
      ]);
    });
    it("dispatches no additional actions if the job is in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs
      );

      store.dispatch(receiveJobUpdate(mockWorkingUploadJob));

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        receiveJobUpdate(mockWorkingUploadJob),
      ]);
    });
    it("dispatches no additional actions if the job is not tracked in state", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs
      );
      const action = receiveJobUpdate({
        ...mockWorkingUploadJob,
        jobId: "bert",
      });

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([action]);
    });
    it("dispatches no additional actions if the job status did not change", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs
      );

      store.dispatch(receiveJobUpdate(mockWorkingUploadJob));

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        receiveJobUpdate(mockWorkingUploadJob),
      ]);
    });
    it("dispatches uploadSucceeded if the job is an upload job that succeeded and previously was in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs,
        undefined,
        undefined,
        false
      );
      const action = receiveJobUpdate({
        ...mockSuccessfulUploadJob,
        jobId: mockWorkingUploadJob.jobId,
      });

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        batchActions([
          action,
          uploadSucceeded(mockSuccessfulUploadJob.jobName || ""),
        ]),
      ]);
    });
    it("dispatches uploadFailed if the job is an upload that failed and previously was in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs,
        undefined,
        undefined,
        false
      );
      const action = receiveJobUpdate({
        ...mockFailedUploadJob,
        jobId: mockWorkingUploadJob.jobId,
        jobName: "someJobName",
        serviceFields: {
          ...mockFailedUploadJob.serviceFields,
          error: "foo",
          type: "upload",
        },
      });

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        batchActions([
          action,
          uploadFailed("someJobName", "Upload someJobName Failed: foo"),
        ]),
      ]);
    });
  });
});
