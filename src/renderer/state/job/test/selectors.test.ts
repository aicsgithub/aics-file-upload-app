import { expect } from "chai";
import * as moment from "moment";

import { DATETIME_FORMAT } from "../../../constants";
import { getCurrentUploadName } from "../../../containers/App/selectors";
import { AsyncRequest } from "../../feedback/types";

import {
    getMockStateWithHistory,
    mockFailedAddMetadataJob,
    mockFailedUploadJob,
    mockState,
    mockSuccessfulAddMetadataJob,
    mockSuccessfulCopyJob,
    mockSuccessfulUploadJob,
    mockUnrecoverableUploadJob,
    mockWorkingAddMetadataJob,
    mockWorkingCopyJob,
    mockWorkingUploadJob,
    nonEmptyJobStateBranch,
} from "../../test/mocks";

import {
    getAreAllJobsComplete,
    getCurrentJobName,
    getIsSafeToExit,
    getJobsForTable,
    getUploadInProgress,
} from "../selectors";

describe("Job selectors", () => {
    describe("getJobsForTable", () => {
        it("converts jobs in redux store to objects used by upload summary page", () => {
            const jobs = [...nonEmptyJobStateBranch.uploadJobs];
            const jobTableRows = getJobsForTable({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            expect(jobTableRows.length).to.equal(jobs.length);
            jobTableRows.forEach((jobTableRow) => {
                const match = jobs.find((job) => {
                    return job.jobName === jobTableRow.jobName &&
                        job.jobId === jobTableRow.key &&
                        job.currentStage === jobTableRow.currentStage &&
                        job.status === jobTableRow.status;
                });
                expect(match).to.not.be.undefined;
            });
        });
    });

    describe("getIsSafeToExit", () => {
        it("returns true if no jobs", () => {
            const isSafeToExit = getIsSafeToExit(mockState);
            expect(isSafeToExit).to.be.true;
        });

        it("returns true if an upload job is failed", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    addMetadataJobs: [{ ...mockFailedAddMetadataJob, parentId: mockFailedUploadJob.jobId }],
                    uploadJobs: [{
                        ...mockFailedUploadJob,
                        serviceFields: {
                            ...mockFailedUploadJob.serviceFields,
                            copyJobId: mockWorkingCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.true;
        });

        it("returns true if an upload job is in progress and its add metadata job is successful", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    addMetadataJobs: [{ ...mockSuccessfulAddMetadataJob, parentId: mockWorkingUploadJob.jobId }],
                    copyJobs: [mockSuccessfulCopyJob],
                    uploadJobs: [{
                        ...mockWorkingUploadJob,
                        serviceFields: {
                            ...mockWorkingUploadJob.serviceFields,
                            copyJobId: mockSuccessfulCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.true;
        });

        it("returns true if an upload job is in progress and its add metadata job is failed", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    addMetadataJobs: [{ ...mockFailedAddMetadataJob, parentId: mockWorkingUploadJob.jobId }],
                    copyJobs: [mockSuccessfulCopyJob],
                    uploadJobs: [{
                        ...mockWorkingUploadJob,
                        serviceFields: {
                            ...mockWorkingUploadJob.serviceFields,
                            copyJobId: mockSuccessfulCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.true;
        });

        it("returns false if an upload job is in progress and its add metadata job is in progress", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    addMetadataJobs: [{ ...mockWorkingAddMetadataJob, parentId: mockWorkingUploadJob.jobId }],
                    copyJobs: [mockSuccessfulCopyJob],
                    inProgressUploadJobs: [{
                        ...mockWorkingUploadJob,
                        serviceFields: {
                            ...mockWorkingUploadJob.serviceFields,
                            copyJobId: mockSuccessfulCopyJob.jobId,
                        },
                    }],
                    incompleteJobIds: [mockWorkingUploadJob.jobId],
                    uploadJobs: [],
                },
            });
            expect(isSafeToExit).to.be.false;
        });

        it("returns true if an upload job is complete", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    addMetadataJobs: [{ ...mockSuccessfulAddMetadataJob, parentId: mockSuccessfulUploadJob.jobId }],
                    uploadJobs: [mockSuccessfulUploadJob],
                },
            });
            expect(isSafeToExit).to.be.true;
        });
    });

    describe("getAreAllJobsComplete", () => {
        it("returns true if no jobs exist", () => {
            const complete = getAreAllJobsComplete(mockState);
            expect(complete).to.be.true;
        });

        it("returns false if there are any inProgressUploadJobs", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    inProgressUploadJobs: [mockWorkingUploadJob],
                    uploadJobs: [mockSuccessfulUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns true if all upload jobs succeeded", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockSuccessfulUploadJob],
                },
            });
            expect(complete).to.be.true;
        });

        it("returns true if all upload jobs failed", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockFailedUploadJob, mockFailedUploadJob],
                },
            });
            expect(complete).to.be.true;
        });

        it("returns true if upload jobs are unrecoverable", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockUnrecoverableUploadJob],
                },
            });
            expect(complete).to.be.true;
        });

        it("returns true if all upload jobs failed or succeeded or unrecoverable", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockFailedUploadJob, mockSuccessfulUploadJob, mockUnrecoverableUploadJob],
                },
            });
            expect(complete).to.be.true;
        });
    });
    describe("getCurrentJobName", () => {
        it("returns undefined if upload is empty", () => {
            const name = getCurrentUploadName({
                ...mockState,
                upload: getMockStateWithHistory({}),
            });
            expect(name).to.be.undefined;
        });
        it("returns name of current upload if already saved", () => {
            const now = new Date();
            const name = getCurrentJobName({
                ...mockState,
                metadata: {
                    ...mockState.metadata,
                    currentUpload: {
                        created: now,
                        modified: now,
                        name: "test",
                    },
                },
                upload: getMockStateWithHistory({
                    foo: {
                        barcode: "1234",
                        file: "/path",
                        wellIds: [1, 2],
                    },
                }),
            });
            expect(name).to.equal(`test ${moment(now).format(DATETIME_FORMAT)}`);
        });
        it("returns names of files and created date if not saved", () => {
            const name = getCurrentJobName({
                ...mockState,
                upload: getMockStateWithHistory({
                    bar: {
                        barcode: "1234",
                        file: "bar",
                        wellIds: [1, 2],
                    },
                    foo: {
                        barcode: "1234",
                        file: "foo",
                        wellIds: [1, 2],
                    },
                }),
            });
            expect(name).to.not.be.undefined;
            if (name) {
                expect(name.includes("bar, foo")).to.be.true;
            }
        });
    });
    describe("getUploadInProgress", () => {
        it("returns false if requestsInProgress does not contain INITIATE_UPLOAD-currentUploadName", () => {
            const inProgress = getUploadInProgress(mockState);
            expect(inProgress).to.be.false;
        });
        it("returns true if requestsInProgress contains INITIATE_UPLOAD-currentUploadName", () => {
            const now = new Date();
            const currentJobName = `foo ${moment(now).format(DATETIME_FORMAT)}`;
            const inProgress = getUploadInProgress({
                ...mockState,
                feedback: {
                    ...mockState.feedback,
                    requestsInProgress: [`${AsyncRequest.INITIATE_UPLOAD}-${currentJobName}`],
                },
                metadata: {
                    ...mockState.metadata,
                    currentUpload: {
                        created: now,
                        modified: now,
                        name: "foo",
                    },
                },
            });
            expect(inProgress).to.be.true;
        });
        it("returns false if requestsInProgress contains request belonging to a different upload", () => {
            const now = new Date();
            const inProgress = getUploadInProgress({
                ...mockState,
                feedback: {
                    ...mockState.feedback,
                    requestsInProgress: [`${AsyncRequest.INITIATE_UPLOAD}-bar`],
                },
                metadata: {
                    ...mockState.metadata,
                    currentUpload: {
                        created: now,
                        modified: now,
                        name: "foo",
                    },
                },
                upload: getMockStateWithHistory({
                    foo: {
                        barcode: "1234",
                        file: "foo",
                        wellIds: [1],
                    },
                }),
            });
            expect(inProgress).to.be.false;
        });
    });
});
