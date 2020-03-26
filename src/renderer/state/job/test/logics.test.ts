import { expect } from "chai";
import { difference } from "lodash";
import { createSandbox, stub } from "sinon";
import { JOB_STORAGE_KEY } from "../../../../shared/constants";

import { SET_ALERT } from "../../feedback/constants";
import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";

import { createMockReduxStore, getApplicationMenu, logger, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    mockFailedUploadJob,
    mockState,
    mockSuccessfulAddMetadataJob,
    mockSuccessfulCopyJob,
    mockSuccessfulUploadJob,
} from "../../test/mocks";
import { State } from "../../types";
import { getActionFromBatch } from "../../util";
import { updateIncompleteJobNames } from "../actions";
import {
    FAILED_STATUSES,
    PENDING_STATUSES,
    REMOVE_PENDING_JOB,
    SET_ADD_METADATA_JOBS,
    SET_COPY_JOBS,
    SET_UPLOAD_JOBS,
    SUCCESSFUL_STATUS,
    UPDATE_INCOMPLETE_JOB_NAMES,
} from "../constants";
import { getJobStatusesToInclude, mapJobsToActions } from "../logics";
import { getIncompleteJobNames } from "../selectors";
import { JobFilter } from "../types";

describe("Job logics", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("getJobStatusesToInclude", () => {
        it("Filters by failed jobs when Failed Job Filter supplied", () => {
            const statuses = getJobStatusesToInclude(JobFilter.Failed);
            const pendingStatusesNotIncluded = difference(PENDING_STATUSES, statuses);
            expect(pendingStatusesNotIncluded).to.be.empty;

            const failedStatusesNotIncluded = difference(FAILED_STATUSES, statuses);
            expect(failedStatusesNotIncluded).to.be.empty;
            expect(statuses.length).to.equal(PENDING_STATUSES.length + FAILED_STATUSES.length);
        });

        it("Filters by successful jobs when Successful Job Filter supplied", () => {
            const statuses = getJobStatusesToInclude(JobFilter.Successful);
            const pendingStatusesNotIncluded = difference(PENDING_STATUSES, statuses);
            expect(pendingStatusesNotIncluded).to.be.empty;

            const successfulStatus = statuses.find((s) => s === SUCCESSFUL_STATUS);
            expect(successfulStatus).to.not.be.undefined;
            expect(statuses.length).to.equal(PENDING_STATUSES.length + 1);
        });

        it("Filters by pending jobs when Pending Job Filter supplied", () => {
            const statuses = getJobStatusesToInclude(JobFilter.Pending);
            const pendingStatusesNotIncluded = difference(PENDING_STATUSES, statuses);
            expect(pendingStatusesNotIncluded).to.be.empty;
            expect(statuses.length).to.equal(PENDING_STATUSES.length);
        });

        it("Includes all statuses when All Job Filter supplied", () => {
            const statuses = getJobStatusesToInclude(JobFilter.All);
            const pendingStatusesNotIncluded = difference(PENDING_STATUSES, statuses);
            expect(pendingStatusesNotIncluded).to.be.empty;

            const successfulStatus = statuses.find((s) => s === SUCCESSFUL_STATUS);
            expect(successfulStatus).to.not.be.undefined;

            const failedStatusesNotIncluded = difference(FAILED_STATUSES, statuses);
            expect(failedStatusesNotIncluded).to.be.empty;

            expect(statuses.length).to.equal(PENDING_STATUSES.length + FAILED_STATUSES.length + 1);
        });
    });

    describe("mapJobsToActions", () => {
        const addMetadataJobs = [mockSuccessfulAddMetadataJob];
        const copyJobs = [mockSuccessfulCopyJob];
        const uploadJobs =  [mockSuccessfulUploadJob];
        const storage = {
            clear: stub(),
            get: stub(),
            has: stub(),
            set: stub(),
        };

        it("Sets jobs passed in",  () => {
            const getState = () => mockState;
            const actions = mapJobsToActions(getState, storage, logger, getApplicationMenu)({
                addMetadataJobs,
                copyJobs,
                potentiallyIncompleteJobs: [],
                uploadJobs,
            });
            const setAddMetadataJobsAction = getActionFromBatch(actions, SET_ADD_METADATA_JOBS);
            const setCopyJobsAction = getActionFromBatch(actions, SET_COPY_JOBS);
            const setUploadJobsAction = getActionFromBatch(actions, SET_UPLOAD_JOBS);
            const removePendingJobsAction = getActionFromBatch(actions, REMOVE_PENDING_JOB);

            expect(setAddMetadataJobsAction).to.not.be.undefined;
            expect(setCopyJobsAction).to.not.be.undefined;
            expect(setUploadJobsAction).to.not.be.undefined;
            expect(removePendingJobsAction).to.be.undefined;
        });

        it("Removes pending job names that are found in the uploadJobs passed in", () => {
            const getState = (): State => ({
                ...mockState,
                job: {
                    ...mockState.job,
                    pendingJobs: [{...mockSuccessfulUploadJob, uploads: {}}],
                },
            });
            const actions = mapJobsToActions(getState, storage, logger, getApplicationMenu)({
                addMetadataJobs,
                copyJobs,
                potentiallyIncompleteJobs: [],
                uploadJobs,
            });
            const removePendingJobsAction = getActionFromBatch(actions, REMOVE_PENDING_JOB);
            expect(removePendingJobsAction).to.not.be.undefined;
        });

        it("Sends alert for successful upload job given incomplete job",  () => {
            const setStub = stub();
            sandbox.replace(storage, "set", setStub);

            const getState = () => ({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: ["mockJob1"],
                    jobFilter: JobFilter.All,
                },
            });

            const actions = mapJobsToActions(getState, storage, logger, getApplicationMenu)({
                addMetadataJobs,
                copyJobs,
                potentiallyIncompleteJobs: [
                    {...mockSuccessfulUploadJob, created: new Date("2019-01-01"), jobId: "job1"},
                    {...mockSuccessfulUploadJob, created: new Date("2020-01-01"), jobId: "job2"},
                    {...mockSuccessfulUploadJob, created: new Date("2018-01-01"), jobId: "job3"},
                ],
                uploadJobs,
            });

            const updateIncompleteJobNamesAction = getActionFromBatch(actions, UPDATE_INCOMPLETE_JOB_NAMES);
            expect(updateIncompleteJobNamesAction).to.not.be.undefined;
            if (updateIncompleteJobNamesAction) {
                expect(updateIncompleteJobNamesAction.payload).to.be.empty;
            }

            const setAlertAction = getActionFromBatch(actions, SET_ALERT);
            expect(setAlertAction).to.not.be.undefined;
            expect(setStub.calledWith(`${JOB_STORAGE_KEY}.incompleteJobNames`, [])).to.be.true;
            if (setAlertAction) {
                expect(setAlertAction.payload.type).to.equal(AlertType.SUCCESS);
                expect(setAlertAction.payload.message).to.equal("mockJob1 Succeeded");
            }
        });

        it("Sends alert for failed upload job given incomplete job", () => {
            const setStub = stub();
            sandbox.replace(storage, "set", setStub);

            const getState = () => ({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: ["mockFailedUploadJob"],
                    jobFilter: JobFilter.All,
                },
            });
            const actions = mapJobsToActions(getState, storage, logger, getApplicationMenu)({
                addMetadataJobs,
                copyJobs,
                potentiallyIncompleteJobs: [mockFailedUploadJob],
                uploadJobs,
            });

            const updateIncompleteJobNamesAction = getActionFromBatch(actions, UPDATE_INCOMPLETE_JOB_NAMES);
            expect(updateIncompleteJobNamesAction).to.not.be.undefined;
            if (updateIncompleteJobNamesAction) {
                expect(updateIncompleteJobNamesAction.payload).to.be.empty;
            }

            const setAlertAction = getActionFromBatch(actions, SET_ALERT);
            expect(setAlertAction).to.not.be.undefined;
            expect(setStub.calledWith(`${JOB_STORAGE_KEY}.incompleteJobNames`, [])).to.be.true;
            if (setAlertAction) {
                expect(setAlertAction.payload.type).to.equal(AlertType.ERROR);
                expect(setAlertAction.payload.message).to.equal("mockFailedUploadJob Failed");
            }
        });
    });

    describe("updateIncompleteJobsLogic", () => {
        it("Sets incomplete jobs", async () => {
            const { logicMiddleware, store } = createMockReduxStore(mockState, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;
            expect(getIncompleteJobNames(state)).to.be.empty;

            // apply
            store.dispatch(updateIncompleteJobNames(["file1", "file2"]));

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getAlert(state)).to.be.undefined;
            expect(getIncompleteJobNames(state)).to.deep.equal(["file1", "file2"]);
        });
    });
});
