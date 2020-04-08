import { expect } from "chai";
import { StateWithHistory } from "redux-undo";

import { closeUploadTab } from "../../route/actions";
import { getMockStateWithHistory, mockState } from "../../test/mocks";

import { applyTemplate, replaceUpload, updateUpload } from "../actions";
import { getUploadRowKey } from "../constants";
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
    describe("applyTemplate", () => {
        const file = "/path/to/file1";
        const key = getUploadRowKey({file});
        const wellId = 1;
        const templateId = 2;
        const favoriteColor = "red";
        let mockStateWithFavoriteColor: StateWithHistory<UploadStateBranch>;

        beforeEach(() => {
            mockStateWithFavoriteColor = getMockStateWithHistory({
                [key]: {
                    barcode: "1234",
                    favoriteColor,
                    file,
                    key,
                    shouldBeInArchive: true,
                    shouldBeInLocal: true,
                    templateId: 100,
                    wellIds: [wellId],
                },
            });
        });
        it("updates uploads with a templateId and clears template-specific annotations by default", () => {
            const result = reducer(mockStateWithFavoriteColor, applyTemplate(templateId));
            const upload = result.present[key];
            expect(upload).to.deep.equal({
                barcode: "1234",
                file,
                key,
                shouldBeInArchive: true,
                shouldBeInLocal: true,
                templateId,
                wellIds: [wellId],
            });
        });
        it("does not clear template-related annotations if clearAnnotations=false", () => {
            const result = reducer(mockStateWithFavoriteColor, applyTemplate(templateId, false));
            const upload = result.present[key];
            expect(upload).to.deep.equal({
                barcode: "1234",
                favoriteColor,
                file,
                key,
                shouldBeInArchive: true,
                shouldBeInLocal: true,
                templateId,
                wellIds: [wellId],
            });
        });
    });
});
