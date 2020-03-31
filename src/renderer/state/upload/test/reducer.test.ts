import { expect } from "chai";

import { closeUploadTab } from "../../route/actions";
import { getMockStateWithHistory, mockState } from "../../test/mocks";

import { replaceUpload, updateUpload } from "../actions";
import reducer from "../reducer";
import { UploadStateBranch } from "../types";

describe("upload reducer", () => {
    let uploads: UploadStateBranch;

    beforeEach(() => {
        uploads = {
            foo: {
                barcode: "1234",
                file: "/path",
                wellIds: [1, 2],
            },
        };
    });
    describe("updateUpload", () => {
        it("does not change anything if key doesn't exist on upload", () => {
            const result = reducer(getMockStateWithHistory({}), updateUpload("foo", { wellIds: [1, 2] }));
            const { present } = result;
            expect(present).to.be.empty;
        });
        it("updates upload at key specified", () => {
            const result = reducer(getMockStateWithHistory(uploads), updateUpload("foo", { wellIds: [3] }));
            const { present } = result;
            expect(present.foo.wellIds).to.deep.equal([3]);
        });
    });
    describe("replaceUpload", () => {
        it("replaces entire upload with upload in draft", () => {
            const uploadPartial = {
                barcode: "5678",
                file: "/path2",
                wellIds: [9],
            };
            const draft = {
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    name: "test",
                },
                state: {
                    ...mockState,
                    upload: getMockStateWithHistory({
                        bar: uploadPartial,
                    }),
                },

            };
            const result = reducer(getMockStateWithHistory(uploads), replaceUpload(draft));
            const { present } = result;
            expect(present.foo).to.be.undefined;
            expect(present.bar).to.equal(uploadPartial);
        });
    });
    describe("closeUploadTab", () => {
        it("clears all uploads", () => {
            const result = reducer(getMockStateWithHistory(uploads), closeUploadTab());
            const { present } = result;
            expect(present).to.be.empty;
        });
    });
});
