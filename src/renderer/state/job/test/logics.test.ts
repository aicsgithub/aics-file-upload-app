import { expect } from "chai";
import { get } from "lodash";

import { createMockReduxStore } from "../../test/configure-mock-store";
import { mockJob, mockState, nonEmptyJobStateBranch } from "../../test/mocks";
import { updateJob } from "../actions";
import { getCurrentJob } from "../selectors";

describe("Job logics", () => {

    describe("updateJobLogic", () => {
        it("Updates current job with stage if it exists", () => {
            const store = createMockReduxStore({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            // before
            let currentJob = getCurrentJob(store.getState());
            expect(get(currentJob, "stage")).to.equal(mockJob.stage);

            // apply
            const nextStage = "Failed";
            store.dispatch(updateJob(mockJob.name, { stage: nextStage }));

            // after
            currentJob = getCurrentJob(store.getState());
            expect(get(currentJob, "stage")).to.equal(nextStage);
        });

        // todo add test to make sure name cannot be updated
    });
});
