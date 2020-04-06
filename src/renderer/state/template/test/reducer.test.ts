import { expect } from "chai";
import { closeUploadTab } from "../../route/actions";
import { getMockStateWithHistory, nonEmptyStateForInitiatingUpload } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";

import reducer from "../reducer";
import { initialState } from "../reducer";
import { getAppliedTemplate } from "../selectors";

describe("template reducer", () => {
    describe("replaceUpload", () => {
        it("sets appliedTemplate", () => {
            const replacement = {
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    name: "test",
                },
                state: nonEmptyStateForInitiatingUpload,
            };
            const result = reducer(getMockStateWithHistory(initialState), replaceUpload(replacement));
            expect(result.present.appliedTemplate).to.equal(getAppliedTemplate(nonEmptyStateForInitiatingUpload));
        });
    });
    describe("closeUploadTab", () => {
        it("clears appliedTemplate", () => {
            const result = reducer(nonEmptyStateForInitiatingUpload.template, closeUploadTab());
            expect(result.present.appliedTemplate).to.be.undefined;
        });
    });
});