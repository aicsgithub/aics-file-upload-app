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
