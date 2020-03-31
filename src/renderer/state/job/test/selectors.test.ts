import { expect } from "chai";
import * as moment from "moment";

import { DATETIME_FORMAT } from "../../../constants";
import { getCurrentUploadName } from "../../../containers/App/selectors";

import {
    getMockStateWithHistory,
    mockBlockedUploadJob,
    mockFailedAddMetadataJob,
    mockFailedCopyJob,
    mockFailedUploadJob,
    mockPendingJob,
    mockRetryingUploadJob,
    mockState,
    mockSuccessfulAddMetadataJob,
    mockSuccessfulCopyJob,
    mockSuccessfulUploadJob,
    mockUnrecoverableUploadJob,
    mockWaitingUploadJob,
    mockWorkingAddMetadataJob,
    mockWorkingCopyJob,
    mockWorkingUploadJob,
    nonEmptyJobStateBranch,
} from "../../test/mocks";

import {
    getAreAllJobsComplete,
    getCurrentJobIsIncomplete,
    getCurrentJobName,
    getIsSafeToExit,
    getJobsForTable,
    getUploadInProgress,
} from "../selectors";

describe("Job selectors", () => {
    describe("getJobsForTable", () => {
        it("converts jobs in redux store to objects used by upload summary page", () => {
            const jobs = [...nonEmptyJobStateBranch.uploadJobs, ...nonEmptyJobStateBranch.pendingJobs];
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
                        job.status === jobTableRow.status &&
                        job.modified === jobTableRow.modified;
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

        it("returns false if there are any pending jobs", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {...mockState.job, pendingJobs: [mockPendingJob]},
            });
            expect(isSafeToExit).to.be.false;
        });

        it("returns false if an upload job is in progress and its add metadata job doesn't exist", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockWorkingUploadJob],
                },
            });
            expect(isSafeToExit).to.be.false;
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
                    uploadJobs: [{
                        ...mockWorkingUploadJob,
                        serviceFields: {
                            ...mockWorkingUploadJob.serviceFields,
                            copyJobId: mockSuccessfulCopyJob.jobId,
                        },
                    }],
                },
            });
            expect(isSafeToExit).to.be.false;
        });

        it("returns false if an upload job is in progress and its add metadata job doesnt exist", () => {
            const isSafeToExit = getIsSafeToExit({
                ...mockState,
                job: {
                    ...mockState.job,
                    addMetadataJobs: [],
                    uploadJobs: [{
                        ...mockWorkingUploadJob,
                        serviceFields: {
                            ...mockWorkingUploadJob.serviceFields,
                            copyJobId: mockFailedCopyJob.jobId,
                        },
                    }],
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

        it("returns false if pending jobs exist", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    pendingJobs: [mockPendingJob],
                    uploadJobs: [mockSuccessfulUploadJob, mockSuccessfulUploadJob, mockSuccessfulUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is working", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockWorkingUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is retrying", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockRetryingUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is waiting", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockWaitingUploadJob],
                },
            });
            expect(complete).to.be.false;
        });

        it("returns false if an upload job is blocked", () => {
            const complete = getAreAllJobsComplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    uploadJobs: [mockSuccessfulUploadJob, mockBlockedUploadJob],
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
    describe("getCurrentJobIsIncomplete", () => {
        it("returns false if no current job", () => {
            const now = new Date();
            const currentJobIsIncomplete = getCurrentJobIsIncomplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [`foo ${moment(now).format(DATETIME_FORMAT)}`],
                },
                upload: getMockStateWithHistory({}),
            });
            expect(currentJobIsIncomplete).to.be.false;
        });
        it("returns false if incompleteJobNames does not include current job name", () => {
            const now = new Date();
            const currentJobIsIncomplete = getCurrentJobIsIncomplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [],
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
            expect(currentJobIsIncomplete).to.be.false;
        });
        it("returns true if incompleteJobNames includes current job name", () => {
            const now = new Date();
            const currentJobIsIncomplete = getCurrentJobIsIncomplete({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [`foo ${moment(now).format(DATETIME_FORMAT)}`],
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
            expect(currentJobIsIncomplete).to.be.true;
        });
    });
    describe("getUploadInProgress", () => {
        const now = new Date();
        it("returns false if no current job", () => {

            const inProgress = getUploadInProgress({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [`foo ${moment(now).format(DATETIME_FORMAT)}`],
                },
                upload: getMockStateWithHistory({}),
            });
            expect(inProgress).to.be.false;
        });
        it("returns true if current job is incomplete", () => {
            const inProgress = getUploadInProgress({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [`foo ${moment(now).format(DATETIME_FORMAT)}`],
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
            expect(inProgress).to.be.true;
        });
        it("returns true if current job is pending", () => {
            const inProgress = getUploadInProgress({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [],
                    pendingJobs: [{
                        ...mockPendingJob,
                        jobName: `foo ${moment(now).format(DATETIME_FORMAT)}`,
                    }],
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
            expect(inProgress).to.be.true;
        });
        it("returns false if current job is not incomplete or pending", () => {
            const inProgress = getUploadInProgress({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: [],
                    pendingJobs: [],
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
