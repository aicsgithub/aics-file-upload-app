import { expect } from "chai";
import { get, keys } from "lodash";
import * as moment from "moment";
import { createSandbox, stub } from "sinon";

import { LabkeyTemplate } from "../../../util/labkey-client/types";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { getSelectedFiles } from "../../selection/selectors";
import { createMockReduxStore, fms, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    getMockStateWithHistory,
    mockDateAnnotation,
    mockNumberAnnotation,
    mockTemplateStateBranch,
    mockTemplateWithManyValues, mockTextAnnotation,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
    applyTemplate,
    associateFilesAndWells,
    initiateUpload, updateFilesToArchive,
    updateFilesToStoreOnIsilon,
    updateScenes,
    updateUpload,
} from "../actions";
import { getUploadRowKey } from "../constants";
import {
    getAppliedTemplateId,
    getFileToArchive,
    getFileToStoreOnIsilon,
    getUpload,
    getUploadSummaryRows,
} from "../selectors";

describe("Upload logics", () => {
    describe("associateFileAndWellLogic", () => {
        it("clears files and associates well with file", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
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
        it("updates uploads with a templateId", async () => {
            const { logicMiddleware, store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
            const file1 = "/path1";
            const file2 = "/path2";
            const wellId = 1;
            const schema: LabkeyTemplate = {
                Name: "My Template",
                TemplateId: 1,
                Version: 1,
            };

            // before
            const state = store.getState();
            expect(getAppliedTemplateId(state)).to.be.undefined;
            store.dispatch(associateFilesAndWells([file1, file2], [wellId], ["A1"]));

            // apply
            store.dispatch(applyTemplate(schema));

            // after
            await logicMiddleware.whenComplete();
            const upload = getUpload(store.getState());
            expect(get(upload, [file1, "templateId"])).to.equal(1);
            expect(get(upload, [file2, "templateId"])).to.equal(1);
            expect(get(upload, [file1, "wellIds", 0])).to.equal(wellId);
            expect(get(upload, [file2, "wellIds", 0])).to.equal(wellId);
        });
    });

    describe("initiateUploadLogic", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("adds an info alert given valid metadata", async () => {
            sandbox.replace(fms, "uploadFiles", stub().resolves());
            sandbox.replace(fms, "validateMetadata", stub().resolves());
            const { logicMiddleware, store } = createMockReduxStore(
                nonEmptyStateForInitiatingUpload,
                mockReduxLogicDeps
            );

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            await logicMiddleware.whenComplete();

            state = store.getState();
            const alert = getAlert(state);
            expect(alert).to.not.be.undefined;
            if (alert) {
                expect(alert.type).to.equal(AlertType.INFO);
            }
        });
        it("does not add job given invalid metadata", async () => {
            sandbox.replace(fms, "validateMetadata", stub().rejects());
            const { logicMiddleware, store } = createMockReduxStore(
                nonEmptyStateForInitiatingUpload,
                mockReduxLogicDeps
            );

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            // apply
            store.dispatch(initiateUpload());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            const alert = getAlert(state);
            expect(alert).to.not.be.undefined;
            if (alert) {
                expect(alert.type).to.equal(AlertType.ERROR);
            }
        });
    });
    describe("updateScenesLogic", () => {
        const file = "/path/to/file1";
        const fileRowKey = getUploadRowKey(file);
        const mockChannel = { channelId: 1, description: "", name: ""};

        it("allows positionIndex = 0 to be added", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                store.dispatch(updateScenes(fileRow, [0], []));
            }

            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(4);
        });

        it("does not remove well associations from the file row if file does not have a scene", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [], [mockChannel]));
            }

            state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;
        });
        it("removes well associations from the file row if file has at least one scene", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [1], []));
            }

            // after
            state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.be.empty;
        });
        it("adds channel-only uploads", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [], [mockChannel]));

                // after
                state = store.getState();
                expect(keys(getUpload(state)).length).to.equal(4);
                const channelUpload = getUpload(state)[getUploadRowKey(file, undefined, 1)];
                expect(channelUpload).to.not.be.undefined;
                expect(channelUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: mockChannel,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: getUploadRowKey(file, undefined, 1),
                    notes: undefined,
                    positionIndex: undefined,
                    wellIds: [],
                    wellLabels: [],
                    workflows: [],
                });
            }
        });
        it("adds scene-only uploads", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [1], []));

                // after
                state = store.getState();
                expect(keys(getUpload(state)).length).to.equal(4);
                const sceneUpload = getUpload(state)[getUploadRowKey(file, 1)];
                expect(sceneUpload).to.not.be.undefined;
                expect(sceneUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: undefined,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: getUploadRowKey(file, 1),
                    notes: undefined,
                    positionIndex: 1,
                    wellIds: [],
                    wellLabels: [],
                    workflows: [],
                });
            }
        });
        it("adds scene+channel uploads", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [1], [mockChannel]));

                // after
                state = store.getState();
                const uploads = getUpload(state);
                // there should be a new upload representing:
                // just the scene, just the channel, and the scene and channel together
                expect(keys(uploads).length).to.equal(6);
                const sceneUpload = uploads[getUploadRowKey(file, 1)];
                expect(sceneUpload).to.not.be.undefined;
                expect(sceneUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: undefined,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: getUploadRowKey(file, 1),
                    notes: undefined,
                    positionIndex: 1,
                    wellIds: [],
                    wellLabels: [],
                    workflows: [],
                });

                const sceneAndChannelKey = getUploadRowKey(file, 1, 1);
                const sceneAndChannelUpload = uploads[sceneAndChannelKey];
                expect(sceneAndChannelUpload).to.not.be.undefined;
                expect(sceneAndChannelUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: mockChannel,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: sceneAndChannelKey,
                    notes: undefined,
                    positionIndex: 1,
                    wellIds: [],
                    wellLabels: [],
                    workflows: [],
                });
            }
        });
        it("removes uploads that don't exist anymore", () => {
            const sceneKey = getUploadRowKey(file, 1);
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [getUploadRowKey(file)]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                        wellLabels: [],
                    },
                    [getUploadRowKey(file, 1)]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [1],
                        wellLabels: ["A1"],
                    },
                }),
            }, mockReduxLogicDeps);

            // before
            const state = store.getState();
            expect(getUpload(state)[sceneKey]).to.not.be.undefined;
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [2], [mockChannel]));
                const uploads = getUpload(store.getState());
                expect(uploads[sceneKey]).to.be.undefined;
            }
        });
    });

    describe("updateUploadLogic", () => {
        const uploadRowKey = getUploadRowKey("/path/to/file1");

        it("converts array of Moment objects to array of dates", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: {
                        ...mockTemplateWithManyValues,
                        annotations: [mockDateAnnotation],
                    },
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        "Birth Date": [],
                        "barcode": "",
                        "file": "/path/to/file3",
                        "notes": undefined,
                        "shouldBeInArchive": true,
                        "shouldBeInLocal": true,
                        "templateId": 8,
                        "wellIds": [],
                        "wellLabels": [],
                        "workflows": [
                            "R&DExp",
                            "Pipeline 4.1",
                        ],
                    },
                }),
            });

            // before
            const annotation = "Birth Date";

            // apply
            store.dispatch(updateUpload(uploadRowKey, {[annotation]: [moment()]}));

            // after
            const upload = getUpload(store.getState());
            expect(upload[uploadRowKey][annotation][0] instanceof Date).to.be.true;
        });
        it("converts moment objects to dates", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: {
                        ...mockTemplateWithManyValues,
                        annotations: [{
                            ...mockDateAnnotation,
                            canHaveManyValues: false,
                        }],
                    },
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        "Birth Date": undefined,
                        "barcode": "",
                        "file": "/path/to/file3",
                        "notes": undefined,
                        "shouldBeInArchive": true,
                        "shouldBeInLocal": true,
                        "templateId": 8,
                        "wellIds": [],
                        "wellLabels": [],
                        "workflows": [
                            "R&DExp",
                            "Pipeline 4.1",
                        ],
                    },
                }),
            });

            // before
            const annotation = "Birth Date";

            // apply
            store.dispatch(updateUpload(uploadRowKey, {[annotation]: moment()}));

            // after
            const upload = getUpload(store.getState());
            expect(upload[uploadRowKey][annotation] instanceof Date).to.be.true;
        });
        it("converts strings to arrays of strings if canHaveManyValues=true and type is TEXT", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: {
                        ...mockTemplateWithManyValues,
                        annotations: [mockTextAnnotation],
                    },
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        "Another Garbage Text Annotation": undefined,
                        "barcode": "",
                        "file": "/path/to/file3",
                        "notes": undefined,
                        "shouldBeInArchive": true,
                        "shouldBeInLocal": true,
                        "templateId": 8,
                        "wellIds": [],
                        "wellLabels": [],
                        "workflows": [
                            "R&DExp",
                            "Pipeline 4.1",
                        ],
                    },
                }),
            });

            // before
            const annotation = "Another Garbage Text Annotation";

            // apply
            store.dispatch(updateUpload(uploadRowKey, {[annotation]: "a,b,c"}));

            // after
            const upload = getUpload(store.getState());
            expect(upload[uploadRowKey][annotation]).to.deep.equal(["a", "b", "c"]);
        });
        it("converts strings to arrays of numbers if canHaveManyValues=true and type is NUMBER", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                template: getMockStateWithHistory({
                    ...mockTemplateStateBranch,
                    appliedTemplate: {
                        ...mockTemplateWithManyValues,
                        annotations: [mockNumberAnnotation],
                    },
                }),
                upload: getMockStateWithHistory({
                    [uploadRowKey]: {
                        "Clone Number Garbage": undefined,
                        "barcode": "",
                        "file": "/path/to/file3",
                        "notes": undefined,
                        "shouldBeInArchive": true,
                        "shouldBeInLocal": true,
                        "templateId": 8,
                        "wellIds": [],
                        "wellLabels": [],
                        "workflows": [
                            "R&DExp",
                            "Pipeline 4.1",
                        ],
                    },
                }),
            });

            // before
            const annotation = "Clone Number Garbage";

            // apply
            store.dispatch(updateUpload(uploadRowKey, {[annotation]: "1,2,3"}));

            // after
            const upload = getUpload(store.getState());
            expect(upload[uploadRowKey][annotation]).to.deep.equal([1, 2, 3]);
        });
    });
    describe("updateFilesToStoreOnIsilonLogic", () => {
        it("sets shouldBeInLocal on each file in payload", async () => {
            const { store, logicMiddleware } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
            });

            // before
            expect(getFileToStoreOnIsilon(store.getState())["/path/to/file1"]).to.be.true;

            // apply
            store.dispatch(updateFilesToStoreOnIsilon({"/path/to/file1": false}));

            // after
            await logicMiddleware.whenComplete();
            expect(getFileToStoreOnIsilon(store.getState())["/path/to/file1"]).to.be.false;
        });
    });
    describe("updateFilesToStoreInArchiveLogic", () => {
        it("sets shouldBeInArchive on each file in payload", async () => {
            const { store, logicMiddleware } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
            });

            // before
            expect(getFileToArchive(store.getState())["/path/to/file1"]).to.be.true;

            // apply
            store.dispatch(updateFilesToArchive({"/path/to/file1": false}));

            // after
            await logicMiddleware.whenComplete();
            expect(getFileToArchive(store.getState())["/path/to/file1"]).to.be.false;
        });
    });
});
