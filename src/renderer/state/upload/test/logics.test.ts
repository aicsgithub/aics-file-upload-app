import { expect } from "chai";
import { get } from "lodash";
import { getRecentEvent } from "../../feedback/selectors";
import { getJobs } from "../../job/selectors";

import { getSelectedFiles } from "../../selection/selectors";
import { createMockReduxStore } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { associateFilesAndWell, initiateUpload } from "../actions";
import { getUpload } from "../selectors";

describe("Upload logics", () => {
    describe("associateFileAndWellLogic", () => {
        it("clears files and associates well with file", () => {
            const store = createMockReduxStore(mockState);
            const file1 = "/path1";
            const file2 = "/path2";
            const wellId = 1;

            store.dispatch(associateFilesAndWell(["/path1", "/path2"], wellId));
            expect(getSelectedFiles(store.getState())).to.be.empty;

            const upload = getUpload(store.getState());
            expect(get(upload, [file1, "wellId"])).to.equal(wellId);
            expect(get(upload, [file2, "wellId"])).to.equal(wellId);
        });
    });

    describe("initiateUploadLogic", () => {
        it("adds a job to jobs and adds a Started Upload event", () => {
            const store = createMockReduxStore(mockState);

            // before
            let state = store.getState();
            expect(getJobs(state)).to.be.empty;
            expect(getRecentEvent(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            state = store.getState();
            expect(getJobs(state).length).to.equal(1);
            expect(getRecentEvent(state)).to.not.be.undefined;
        });
    });
});
