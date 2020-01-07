import { expect } from "chai";
import { createSandbox, stub } from "sinon";
import { setAlert } from "../../feedback/actions";
import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";

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
import { retrieveJobs, updateIncompleteJobNames } from "../actions";
import { getAddMetadataJobs, getCopyJobs, getIncompleteJobNames, getUploadJobs } from "../selectors";
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
            callback.onCall(2).returns([mockSuccessfulAddMetadataJob]);
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
        });

        it("Filters by failed jobs when Failed Job Filter supplied", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockFailedUploadJob]);
            callback.onCall(1).returns([mockFailedCopyJob]);
            callback.onCall(2).returns([mockFailedAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    jobFilter: JobFilter.Failed,
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
        });

        it("Filters by successful jobs when Successful Job Filter supplied", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.onCall(2).returns([mockSuccessfulAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    jobFilter: JobFilter.Successful,
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
                    jobFilter: JobFilter.All,
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
        });

        it("Sends alert for successful upload job given incomplete job", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.onCall(2).returns([mockSuccessfulAddMetadataJob]);
            callback.returns([mockSuccessfulUploadJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { actions, logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: ["mockJob1"],
                    jobFilter: JobFilter.All,
                },
            });

            // before
            let state = store.getState();
            expect(getUploadJobs(state)).to.be.empty;
            expect(getCopyJobs(state)).to.be.empty;
            expect(getAddMetadataJobs(state)).to.be.empty;

            expect(getIncompleteJobNames(state)).to.not.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getUploadJobs(state)).to.not.be.empty;
            expect(getCopyJobs(state)).to.not.be.empty;
            expect(getAddMetadataJobs(state)).to.not.be.empty;

            expect(getIncompleteJobNames(state)).to.be.empty;
            expect(actions.includes(setAlert({
                message: `mockJob1 Succeeded`,
                type: AlertType.SUCCESS,
            }))).to.be.true;
        });

        it("Sends alert for failed upload job given incomplete job", async () => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.onCall(2).returns([mockSuccessfulAddMetadataJob]);
            callback.returns([mockFailedUploadJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { actions, logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                job: {
                    ...mockState.job,
                    incompleteJobNames: ["mockFailedUploadJob"],
                    jobFilter: JobFilter.All,
                },
            });

            // before
            let state = store.getState();
            expect(getUploadJobs(state)).to.be.empty;
            expect(getCopyJobs(state)).to.be.empty;
            expect(getAddMetadataJobs(state)).to.be.empty;

            expect(getIncompleteJobNames(state)).to.not.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getUploadJobs(state)).to.not.be.empty;
            expect(getCopyJobs(state)).to.not.be.empty;
            expect(getAddMetadataJobs(state)).to.not.be.empty;

            expect(getIncompleteJobNames(state)).to.be.empty;
            expect(actions.includes(setAlert({
                message: `mockFailedUploadJob Failed`,
                type: AlertType.ERROR,
            }))).to.be.true;
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
