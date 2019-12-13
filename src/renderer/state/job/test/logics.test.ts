import { expect } from "chai";
import { userInfo } from "os";
import { createSandbox, stub } from "sinon";
import { getAlert } from "../../feedback/selectors";

import { createMockReduxStore, jssClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    mockFailedAddMetadataJob,
    mockFailedCopyJob,
    mockFailedUploadJob,
    mockState,
    mockSuccessfulAddMetadataJob,
    mockSuccessfulCopyJob,
    mockSuccessfulUploadJob
} from "../../test/mocks";
import { retrieveJobs } from "../actions";
import { FAILED_STATUSES, PENDING_STATUSES, SUCCESSFUL_STATUS } from "../constants";
import { getAddMetadataJobs, getCopyJobs, getUploadJobs } from "../selectors";
import { JobFilter } from "../types";

describe("Job logics", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("retrieveJobsLogic", () => {
        it("Sets jobs given successful JSS query", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.returns([mockSuccessfulAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
            });

            // before
            let state = store.getState();
            expect(getUploadJobs(state)).to.be.empty;
            expect(getCopyJobs(state)).to.be.empty;
            expect(getAddMetadataJobs(state)).to.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getUploadJobs(state)).to.not.be.empty;
            expect(getCopyJobs(state)).to.not.be.empty;
            expect(getAddMetadataJobs(state)).to.not.be.empty;
            const mockJob = (type: "upload" | "copy" | "add_metadata") => ({
                serviceFields: { type },
                status: { $in: PENDING_STATUSES },
                user: userInfo().username,
            });
            expect(callback.getCall(0).calledWithExactly(mockJob("upload"))).to.be.true;
            expect(callback.getCall(1).calledWithExactly(mockJob("copy"))).to.be.true;
            expect(callback.getCall(2).calledWithExactly(mockJob("add_metadata"))).to.be.true;
        });

        it("Filters by failed jobs when Failed Job Filter supplied", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockFailedUploadJob]);
            callback.onCall(1).returns([mockFailedCopyJob]);
            callback.returns([mockFailedAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    jobFilter: JobFilter.Failed
                },
            });

            // before
            let state = store.getState();
            expect(getUploadJobs(state)).to.be.empty;
            expect(getCopyJobs(state)).to.be.empty;
            expect(getAddMetadataJobs(state)).to.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getUploadJobs(state)).to.not.be.empty;
            expect(getCopyJobs(state)).to.not.be.empty;
            expect(getAddMetadataJobs(state)).to.not.be.empty;
            const mockJob = (type: "upload" | "copy" | "add_metadata") => ({
                serviceFields: { type },
                status: { $in: FAILED_STATUSES },
                user: userInfo().username,
            });
            expect(callback.getCall(0).calledWithExactly(mockJob("upload"))).to.be.true;
            expect(callback.getCall(1).calledWithExactly(mockJob("copy"))).to.be.true;
            expect(callback.getCall(2).calledWithExactly(mockJob("add_metadata"))).to.be.true;
        });

        it("Filters by successful jobs when Successful Job Filter supplied", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.returns([mockSuccessfulAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    jobFilter: JobFilter.Successful
                },
            });

            // before
            let state = store.getState();
            expect(getUploadJobs(state)).to.be.empty;
            expect(getCopyJobs(state)).to.be.empty;
            expect(getAddMetadataJobs(state)).to.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getUploadJobs(state)).to.not.be.empty;
            expect(getCopyJobs(state)).to.not.be.empty;
            expect(getAddMetadataJobs(state)).to.not.be.empty;
            const mockJob = (type: "upload" | "copy" | "add_metadata") => ({
                serviceFields: { type },
                status: { $in: [SUCCESSFUL_STATUS] },
                user: userInfo().username,
            });
            expect(callback.getCall(0).calledWithExactly(mockJob("upload"))).to.be.true;
            expect(callback.getCall(1).calledWithExactly(mockJob("copy"))).to.be.true;
            expect(callback.getCall(2).calledWithExactly(mockJob("add_metadata"))).to.be.true;
        });

        it("Filters by all jobs when All Job Filter supplied", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.returns([mockSuccessfulAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    jobFilter: JobFilter.All
                },
            });

            // before
            let state = store.getState();
            expect(getUploadJobs(state)).to.be.empty;
            expect(getCopyJobs(state)).to.be.empty;
            expect(getAddMetadataJobs(state)).to.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getUploadJobs(state)).to.not.be.empty;
            expect(getCopyJobs(state)).to.not.be.empty;
            expect(getAddMetadataJobs(state)).to.not.be.empty;
            const mockJob = (type: "upload" | "copy" | "add_metadata") => ({
                serviceFields: { type },
                status: { $in: [...FAILED_STATUSES, SUCCESSFUL_STATUS, ...PENDING_STATUSES] },
                user: userInfo().username,
            });
            expect(callback.getCall(0).calledWithExactly(mockJob("upload"))).to.be.true;
            expect(callback.getCall(1).calledWithExactly(mockJob("copy"))).to.be.true;
            expect(callback.getCall(2).calledWithExactly(mockJob("add_metadata"))).to.be.true;
        });

        it("Sets an alert given a non OK response from JSS", async () => {
            sandbox.replace(jssClient, "getJobs", stub().rejects());

            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
            }, mockReduxLogicDeps);

            // before
            let alert = getAlert(store.getState());
            expect(alert).to.be.undefined;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;
        });
    });
});
