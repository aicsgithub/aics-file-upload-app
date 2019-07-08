import { expect } from "chai";
import { stub } from "sinon";
import { getAlert } from "../../feedback/selectors";

import { createMockReduxStore, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { retrieveJobs } from "../actions";
import { getJobs } from "../selectors";

describe("Job logics", () => {

    describe("retrieveJobsLogic", () => {
        it("Sets jobs given successful JSS query", (done) => {
            const store = createMockReduxStore({
                ...mockState,
            });

            // before
            let jobs = getJobs(store.getState());
            expect(jobs).to.be.empty;

            // apply
            store.dispatch(retrieveJobs());

            // after
            store.subscribe(() => {
                jobs = getJobs(store.getState());
                expect(jobs).to.not.be.empty;
                done();
            });
        });

        it("Sets an alert given a non OK response from JSS", (done) => {
            const jssClient = {...mockReduxLogicDeps.jssClient};
            jssClient.getJobs = stub().rejects();

            const store = createMockReduxStore({
                ...mockState,
            }, {...mockReduxLogicDeps, jssClient});

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