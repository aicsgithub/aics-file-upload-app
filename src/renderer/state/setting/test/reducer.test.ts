import { expect } from "chai";
import { mockState } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";

import reducer from "../reducer";
import { initialState } from "../reducer";

describe("setting reducer", () => {
    describe("replaceUpload", () => {
        it("sets associateByWorkflow", () => {
            const result = reducer({
                ...initialState,
                associateByWorkflow: true,
            }, replaceUpload({
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    name: "test",
                },
                state: {
                    ...mockState,
                    setting: {
                        ...mockState.setting,
                        associateByWorkflow: false,
                    },
                },
            }));
            expect(result.associateByWorkflow).to.be.false;
        });
    });
});
