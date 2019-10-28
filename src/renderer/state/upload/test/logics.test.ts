import { expect } from "chai";
import { get } from "lodash";
import { createSandbox, stub } from "sinon";

import { LabkeyTemplate } from "../../../util/labkey-client/types";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { getSelectedFiles } from "../../selection/selectors";
import { createMockReduxStore, fms, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { applyTemplate, associateFilesAndWells, initiateUpload } from "../actions";
import { getAppliedTemplateId, getUpload } from "../selectors";

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

    describe("applyTemplateLogic", () => {
        it("updates uploads with a templateId", (done) => {
            const store = createMockReduxStore(mockState);
            const file1 = "/path1";
            const file2 = "/path2";
            const wellId = 1;
            const schema: LabkeyTemplate = {
                Name: "My Template",
                TemplateId: 1,
            };
            let state = store.getState();
            expect(getAppliedTemplateId(state)).to.be.undefined;

            store.dispatch(associateFilesAndWells([file1, file2], [wellId], ["A1"]));
            store.dispatch(applyTemplate(schema));

            let doneCalled = false;
            store.subscribe(() => {
                if (!doneCalled) {
                    state = store.getState();
                    const upload = getUpload(store.getState());
                    expect(get(upload, [file1, "templateId"])).to.equal(1);
                    expect(get(upload, [file2, "templateId"])).to.equal(1);
                    expect(get(upload, [file1, "wellIds", 0])).to.equal(wellId);
                    expect(get(upload, [file2, "wellIds", 0])).to.equal(wellId);
                    done();
                    doneCalled = true;
                }
            });
        });
    });

    describe("initiateUploadLogic", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("adds an info alert given valid metadata", (done) => {
            sandbox.replace(fms, "uploadFiles", stub().resolves());
            sandbox.replace(fms, "validateMetadata", stub().resolves());
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            let doneCalled = false;
            store.subscribe(() => {
                if (!doneCalled) {
                    state = store.getState();
                    const alert = getAlert(state);
                    expect(alert).to.not.be.undefined;
                    if (alert) {
                        expect(alert.type).to.equal(AlertType.INFO);
                    }
                    done();
                    doneCalled = true;
                }
            });
        });
        it("does not add job given invalid metadata", (done) => {
            sandbox.replace(fms, "validateMetadata", stub().rejects());
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            let doneCalled = false;
            store.subscribe(() => {
                if (!doneCalled) {
                    state = store.getState();
                    const alert = getAlert(state);
                    expect(alert).to.not.be.undefined;
                    if (alert) {
                        expect(alert.type).to.equal(AlertType.ERROR);
                    }
                    done();
                    doneCalled = true;
                }
            });
        });
    });
});
