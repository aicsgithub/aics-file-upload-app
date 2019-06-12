import { expect } from "chai";
import { get } from "lodash";

import { createMockReduxStore } from "../../test/configure-mock-store";
import { mockJob, mockState, nonEmptyJobStateBranch } from "../../test/mocks";
import { setUploadStatus } from "../actions";
import { getCurrentJob } from "../selectors";

describe("Job logics", () => {

    describe("setUploadStatusLogic", () => {
        it("Updates current job with status if it exists", () => {
            const store = createMockReduxStore({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            // before
            let currentJob = getCurrentJob(store.getState());
            expect(get(currentJob, "status")).to.equal(mockJob.status);

            // apply
            const nextStatus = "Failed";
            store.dispatch(setUploadStatus(mockJob.name, nextStatus));

            // after
            currentJob = getCurrentJob(store.getState());
            expect(get(currentJob, "status")).to.equal(nextStatus);
        });
    });
});
