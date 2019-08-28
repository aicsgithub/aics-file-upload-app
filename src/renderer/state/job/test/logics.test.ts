import { expect } from "chai";
import { createSandbox, stub } from "sinon";
import { getAlert } from "../../feedback/selectors";

import { createMockReduxStore, jssClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { mockState, mockSuccessfulUploadJob } from "../../test/mocks";
import { retrieveJobs } from "../actions";
import { getUploadJobs } from "../selectors";

describe("Job logics", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("retrieveJobsLogic", () => {
        it("Sets jobs given successful JSS query", (done) => {
            sandbox.replace(jssClient, "getJobs", stub().resolves([mockSuccessfulUploadJob]));
            const store = createMockReduxStore({
                ...mockState,
            });

            // before
            let jobs = getUploadJobs(store.getState());
            expect(jobs).to.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            store.subscribe(() => {
                jobs = getUploadJobs(store.getState());
                expect(jobs).to.not.be.empty;
                done();
            });
        });

        it("Sets an alert given a non OK response from JSS", (done) => {
            sandbox.replace(jssClient, "getJobs", stub().rejects());

            const store = createMockReduxStore({
                ...mockState,
            }, mockReduxLogicDeps);

            // before
            let alert = getAlert(store.getState());
            expect(alert).to.be.undefined;

            // apply
            store.dispatch(retrieveJobs());

            // after
            store.subscribe(() => {
                alert = getAlert(store.getState());
                expect(alert).to.not.be.undefined;
                done();
            });
        });
    });
});
