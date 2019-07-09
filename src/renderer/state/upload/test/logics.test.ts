import { expect } from "chai";
import { get } from "lodash";
import { stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { getSelectedFiles } from "../../selection/selectors";
import { createMockReduxStore, mockReduxLogicDeps } from "../../test/configure-mock-store";
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
        it("adds an info alert given valid metadata", (done) => {
            const store = createMockReduxStore(mockState, {
                ...mockReduxLogicDeps,
                fms: {
                    validateMetadata: stub().resolves(),
                },
            });

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            store.subscribe(() => {
                state = store.getState();
                const alert = getAlert(state);
                expect(alert).to.not.be.undefined;
                if (alert) {
                    expect(alert.type).to.equal(AlertType.INFO);
                }
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
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            store.subscribe(() => {
                state = store.getState();
                const alert = getAlert(state);
                expect(alert).to.not.be.undefined;
                if (alert) {
                    expect(alert.type).to.equal(AlertType.ERROR);
                }
                done();
            });
        });
    });
});
