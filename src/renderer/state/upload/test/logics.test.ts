import { expect } from "chai";
import { get } from "lodash";
import { stub } from "sinon";

import { getAlert, getRecentEvent } from "../../feedback/selectors";
import { getJobs } from "../../job/selectors";
import { getSelectedFiles } from "../../selection/selectors";
import { createMockReduxStore, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { associateFilesAndWells, initiateUpload } from "../actions";
import { getUpload } from "../selectors";

describe("Upload logics", () => {
    describe("associateFileAndWellLogic", () => {
        it("clears files and associates well with file", () => {
            const store = createMockReduxStore(mockState);
            const file1 = "/path1";
            const file2 = "/path2";
            const wellId = 1;

            store.dispatch(associateFilesAndWells(["/path1", "/path2"], [wellId], ["A1"]));
            expect(getSelectedFiles(store.getState())).to.be.empty;

            const upload = getUpload(store.getState());
            expect(get(upload, [file1, "wellIds", 0])).to.equal(wellId);
            expect(get(upload, [file2, "wellIds", 0])).to.equal(wellId);
        });
    });

    describe("initiateUploadLogic", () => {
        it("adds a job to jobs and adds a Started Upload event given valid metadata", (done) => {
            const store = createMockReduxStore(mockState, {
                ...mockReduxLogicDeps,
                fms: {
                    validateMetadata: stub().resolves(),
                },
            });

            // before
            let state = store.getState();
            expect(getJobs(state)).to.be.empty;
            expect(getRecentEvent(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            store.subscribe(() => {
                state = store.getState();
                expect(getJobs(state).length).to.equal(1);
                expect(getRecentEvent(state)).to.not.be.undefined;
                expect(getAlert(state)).to.be.undefined;
                done();
            });
        });
        it("does not add job given invalid metadata", (done) => {
            const store = createMockReduxStore(mockState, {
                ...mockReduxLogicDeps,
                fms: {
                    validateMetadata: stub().rejects(),
                },
            });

            // before
            let state = store.getState();
            expect(getJobs(state)).to.be.empty;
            expect(getRecentEvent(state)).to.be.undefined;
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            store.subscribe(() => {
                state = store.getState();
                expect(getJobs(state)).to.be.empty;
                expect(getRecentEvent(state)).to.be.undefined;
                expect(getAlert(state)).to.not.be.undefined;
                done();
            });
        });
    });
});
