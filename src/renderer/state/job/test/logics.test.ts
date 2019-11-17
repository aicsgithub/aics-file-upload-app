import { expect } from "chai";
import { createSandbox, stub } from "sinon";
import { getAlert } from "../../feedback/selectors";

import { createMockReduxStore, jssClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    mockState,
    mockSuccessfulAddMetadataJob,
    mockSuccessfulCopyJob,
    mockSuccessfulUploadJob
} from "../../test/mocks";
import { retrieveJobs } from "../actions";
import { getAddMetadataJobs, getCopyJobs, getUploadJobs } from "../selectors";

describe("Job logics", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    describe("retrieveJobsLogic", () => {
        it("Sets jobs given successful JSS query", (done) => {
            const callback = stub();
            callback.onCall(0).returns([mockSuccessfulUploadJob]);
            callback.onCall(1).returns([mockSuccessfulCopyJob]);
            callback.returns([mockSuccessfulAddMetadataJob]);
            sandbox.replace(jssClient, "getJobs", callback);
            const { store } = createMockReduxStore({
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
            store.subscribe(() => {
                state = store.getState();
                expect(getUploadJobs(state)).to.not.be.empty;
                expect(getCopyJobs(state)).to.not.be.empty;
                expect(getAddMetadataJobs(state)).to.not.be.empty;
                done();
            });
        });

        it("Sets an alert given a non OK response from JSS", (done) => {
            sandbox.replace(jssClient, "getJobs", stub().rejects());

            const { store } = createMockReduxStore({
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
