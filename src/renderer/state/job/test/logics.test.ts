import { expect } from "chai";
import { createSandbox, createStubInstance, SinonStubbedInstance } from "sinon";

import { LabkeyClient } from "../../../services";
import FileManagementSystem from "../../../services/fms-client";
import JobStatusClient from "../../../services/job-status-client";
import {
  JSSJob,
  JSSJobStatus,
} from "../../../services/job-status-client/types";
import { UploadServiceFields } from "../../../services/types";
import { setErrorAlert, setInfoAlert } from "../../feedback/actions";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
  ReduxLogicDependencies,
} from "../../test/configure-mock-store";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulETLJob,
  mockSuccessfulUploadJob,
  mockWaitingUploadJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { State } from "../../types";
import { uploadFailed, uploadSucceeded } from "../../upload/actions";
import { RECEIVE_MOST_RECENT_SUCCESSFUL_ETL } from "../../upload/constants";
import {
  receiveJobInsert,
  receiveJobs,
  receiveJobUpdate,
  receiveMostRecentSuccessfulEtl,
  requestMostRecentSuccessfulETL,
} from "../actions";
import { RECEIVE_JOB_UPDATE } from "../constants";
import { receiveJobsLogic } from "../logics";

describe("Job logics", () => {
  const sandbox = createSandbox();
  let jssClient: SinonStubbedInstance<JobStatusClient>;
  let fms: SinonStubbedInstance<FileManagementSystem>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;

  beforeEach(() => {
    jssClient = createStubInstance(JobStatusClient);
    fms = createStubInstance(FileManagementSystem);
    labkeyClient = createStubInstance(LabkeyClient);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("receiveJobsLogic", () => {
    let logicDeps: ReduxLogicDependencies;
    let waitingAbandonedJob: JSSJob<UploadServiceFields>;

    beforeEach(() => {
      waitingAbandonedJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        childIds: ["child_job_id"],
        serviceFields: {
          etlStatus: undefined,
          files: [
            {
              customMetadata: { annotations: [], templateId: 1 },
              file: { fileType: "image", originalPath: "test_path" },
            },
          ],
          lastModified: {},
          md5: {},
          type: "upload",
          uploadDirectory: "/test",
        },
      };
    });

    it("does not do anything if no abandoned jobs", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [receiveJobsLogic]);

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
      } = createMockReduxStore(mockState, logicDeps, [receiveJobsLogic]);
      const action = receiveJobs([mockFailedUploadJob, waitingAbandonedJob]);

      store.dispatch(action);
      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        action,
        setInfoAlert(
          `Upload "${waitingAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
      ]);
    });

    it("finds and retries one abandoned job with children", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [receiveJobsLogic]);

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
      ]);
    });

    it("sets error alert if an error is thrown", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [receiveJobsLogic]);
      const errorMessage = "retry failure!";
      fms.retryUpload.onFirstCall().rejects(new Error(errorMessage));

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          `Upload "${waitingAbandonedJob.jobName}" was abandoned and will now be retried.`
        ),
        setErrorAlert(
          `Retry for upload "${waitingAbandonedJob.jobName}" failed: ${errorMessage}`
        ),
      ]);
    });

    it("dispatches setErrorAlert if fms.retryUpload fails", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [receiveJobsLogic]);

      fms.retryUpload.rejects(new Error("Error"));

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setErrorAlert('Retry for upload "abandoned_job" failed: Error'),
      ]);
    });
  });

  describe("receiveJobInsertLogic", () => {
    it("converts action into receiveJobUpdate action when an ETL job", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockSuccessfulUploadJob],
        },
      });
      const job = {
        ...mockSuccessfulETLJob,
        parentId: mockSuccessfulUploadJob.jobId,
      };
      const expectedJob = {
        ...mockWorkingUploadJob,
        serviceFields: {
          ...mockWorkingUploadJob.serviceFields,
          etlStatus: mockSuccessfulETLJob.status,
        },
      } as JSSJob<UploadServiceFields>;

      // Act
      store.dispatch(receiveJobInsert(job));
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesMatch(receiveJobUpdate(expectedJob))).to.be.true;
    });

    it("passes action along when an upload job insert", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockWorkingUploadJob],
        },
      });

      // Act
      store.dispatch(receiveJobInsert(mockSuccessfulUploadJob));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          type: RECEIVE_JOB_UPDATE,
        })
      ).to.be.false;
    });
  });

  describe("receiveJobUpdateLogic", () => {
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

    it("does not dispatch uploadSucceeded if the etl has yet to complete", async () => {
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

      expect(actions.list).to.deep.equal([action]);
    });

    it("dispatches uploadSucceeded if the job is an upload job that succeeded and previously was in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        {
          ...mockStateWithNonEmptyUploadJobs,
          job: {
            ...mockStateWithNonEmptyUploadJobs.job,
            uploadJobs: [mockSuccessfulUploadJob],
          },
        },
        undefined,
        undefined,
        false
      );
      const action = receiveJobUpdate({
        ...mockSuccessfulUploadJob,
        jobId: "1239131",
        status: JSSJobStatus.SUCCEEDED,
        parentId: mockSuccessfulUploadJob.jobId,
        serviceFields: {
          ...mockSuccessfulUploadJob,
          type: "ETL",
        },
      } as JSSJob<any>);

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        action,
        uploadSucceeded(mockSuccessfulUploadJob.jobName || ""),
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
        action,
        uploadFailed("Upload someJobName failed: foo", "someJobName"),
      ]);
    });
  });

  describe("requestMostRecentSuccessfulETLLogic", () => {
    it("receives most recent successful etl", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        job: {
          ...mockState.job,
          mostRecentSuccessfulETL: 1329041234,
        },
      });
      const mostRecentSuccessfulETL = 1329041235;
      labkeyClient.findMostRecentSuccessfulETL.resolves(
        mostRecentSuccessfulETL
      );

      // Act
      store.dispatch(requestMostRecentSuccessfulETL());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          receiveMostRecentSuccessfulEtl(mostRecentSuccessfulETL)
        )
      ).to.be.true;
    });

    it("avoids dispatching event if no new ETL exists", async () => {
      // Arrange
      const etlEndTime = 1329041234;
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        job: {
          ...mockState.job,
          mostRecentSuccessfulETL: etlEndTime,
        },
      });
      labkeyClient.findMostRecentSuccessfulETL.resolves(etlEndTime);

      // Act
      store.dispatch(requestMostRecentSuccessfulETL());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          type: RECEIVE_MOST_RECENT_SUCCESSFUL_ETL,
        })
      ).to.be.false;
    });
  });
});
