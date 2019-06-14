import { expect } from "chai";
import { get } from "lodash";

import { createMockReduxStore } from "../../test/configure-mock-store";
import { mockJob2, mockState, nonEmptyJobStateBranch } from "../../test/mocks";
import { updateJob } from "../actions";
import { getJobs } from "../selectors";

describe("Job logics", () => {

    describe("updateJobLogic", () => {
        it("Updates job by name with stage if it exists", () => {
            const store = createMockReduxStore({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            // before
            const nextStage = "Failed";
            let jobs = getJobs(store.getState());
            expect(get(jobs[1], "stage")).to.not.equal(nextStage);

            // apply
            store.dispatch(updateJob(mockJob2.name, { stage: nextStage }));

            // after
            jobs = getJobs(store.getState());
            expect(get(jobs[1], "stage")).to.equal(nextStage);
        });

        it("Does not update job name", () => {
            const store = createMockReduxStore({
                ...mockState,
                job: {...nonEmptyJobStateBranch},
            });

            // before
            let jobs = getJobs(store.getState());
            expect(jobs[1].name).to.equal(mockJob2.name);

            // apply
            store.dispatch(updateJob(mockJob2.name, { name: "Bob", stage: "Failed"}));

            // after
            jobs = getJobs(store.getState());
            expect(jobs[1].name).to.equal(mockJob2.name);
        });
    });
});
