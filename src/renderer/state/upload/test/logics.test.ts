import { expect } from "chai";
import { get, keys } from "lodash";
import * as moment from "moment";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { getSelectedBarcode, getSelectedFiles } from "../../selection/selectors";
import { createMockReduxStore, fms, mockReduxLogicDeps } from "../../test/configure-mock-store";
import {
    getMockStateWithHistory,
    mockDateAnnotation,
    mockNumberAnnotation,
    mockTemplateStateBranch,
    mockTemplateWithManyValues,
    mockTextAnnotation,
    mockWellUpload,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
    applyTemplate,
    associateFilesAndWells,
    initiateUpload,
    undoFileWellAssociation,
    updateFilesToArchive,
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
    describe("associateFileAndWellLogic",  () => {
        it("clears files and associates well with file",  () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
            const file1 = "/path1";
            const file2 = "/path2";
            const wellId = 1;

            store.dispatch(associateFilesAndWells([{file: file1}, {file: file2}]));

            const state = store.getState();
            expect(getSelectedFiles(state)).to.be.empty;
            const upload = getUpload(store.getState());
            const selectedBarcode = getSelectedBarcode(state);
            expect(get(upload, [file1, "wellIds", 0])).to.equal(wellId);
            expect(get(upload, [file1, "barcode"])).to.equal(selectedBarcode);
            expect(get(upload, [file2, "wellIds", 0])).to.equal(wellId);
            expect(get(upload, [file2, "barcode"])).to.equal(selectedBarcode);
        });

        it("sets error alert when rowIds is empty", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let alert = getAlert(store.getState());
            expect(alert).to.be.undefined;

            // apply
            store.dispatch(associateFilesAndWells([]));

            // after
            alert = getAlert(store.getState());
            expect(alert).to.deep.equal({
                message: "Cannot associate files and wells: No files selected",
                type: AlertType.ERROR,
            });
        });

        it("sets error alert if a row to associate with a well contains a channelId", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let alert = getAlert(store.getState());
            expect(alert).to.be.undefined;

            // apply
            store.dispatch(associateFilesAndWells([{ file: "foo", channelId: 1 }]));

            // after
            alert = getAlert(store.getState());
            expect(alert).to.deep.equal({
                message: "Cannot associate wells with a channel row",
                type: AlertType.ERROR,
            });
        });

        it("sets error alert when no barcode selected", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                selection: getMockStateWithHistory({
                    ...nonEmptyStateForInitiatingUpload.selection.present,
                    barcode: undefined,
                }),
            });

            // before
            let alert = getAlert(store.getState());
            expect(alert).to.be.undefined;

            // apply
            store.dispatch(associateFilesAndWells([{file: "foo"}]));

            // after
            alert = getAlert(store.getState());
            expect(alert).to.deep.equal({
                message: "Cannot associate files and wells: No plate selected",
                type: AlertType.ERROR,
            });
        });

        it("sets error when no selected wells", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                selection: getMockStateWithHistory({
                    ...nonEmptyStateForInitiatingUpload.selection.present,
                    selectedWells: [],
                }),
            });

            // before
            let alert = getAlert(store.getState());
            expect(alert).to.be.undefined;

            // apply
            store.dispatch(associateFilesAndWells([{ file: "foo" }]));

            // after
            alert = getAlert(store.getState());
            expect(alert).to.deep.equal({
                message: "Cannot associate files and wells: No wells selected",
                type: AlertType.ERROR,
            });
        });

        it("associates wells with files + positionIndex", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
            const file1 = "/path1";
            const wellId = 1;

            store.dispatch(associateFilesAndWells([{file: file1, positionIndex: 1}]));

            const state = store.getState();
            expect(getSelectedFiles(state)).to.be.empty;
            const upload = getUpload(store.getState());
            const selectedBarcode = getSelectedBarcode(state);
            const uploadRowKey = getUploadRowKey({file: file1, positionIndex: 1});
            expect(get(upload, [uploadRowKey, "wellIds", 0])).to.equal(wellId);
            expect(get(upload, [uploadRowKey, "barcode"])).to.equal(selectedBarcode);
        });
    });

    describe("undoFileWellAssociationLogic", () => {
        it("removes well associations and removes file by default from uploads if no well associations left",
            () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let uploadRow = getUpload(store.getState())[getUploadRowKey({file: "/path/to/file1"})];
            expect(uploadRow.wellIds).to.not.be.empty;

            // apply
            store.dispatch(undoFileWellAssociation("/path/to/file1"));

            // after
            uploadRow = getUpload(store.getState())[getUploadRowKey({file: "/path/to/file1"})];
            expect(uploadRow).to.be.undefined;
        });

        it("removes well associations but not entire row if action.payload.deleteUpload = false", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let uploadRow = getUpload(store.getState())[getUploadRowKey({file: "/path/to/file1"})];
            expect(uploadRow.wellIds).to.not.be.empty;

            // apply
            store.dispatch(undoFileWellAssociation("/path/to/file1", undefined, false));

            // after
            uploadRow = getUpload(store.getState())[getUploadRowKey({file: "/path/to/file1"})];
            expect(uploadRow).to.not.be.undefined;
            expect(uploadRow.wellIds).to.be.empty;
        });

        it("removes well associations from row matching file and positionIndex", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let uploadRow = getUpload(store.getState())[getUploadRowKey({file: "/path/to/file3", positionIndex: 1})];
            expect(uploadRow.wellIds.length).to.equal(2);

            // apply
            store.dispatch(undoFileWellAssociation("/path/to/file3", 1, false));

            // after
            uploadRow = getUpload(store.getState())[getUploadRowKey({file: "/path/to/file3", positionIndex: 1})];
            expect(uploadRow).to.not.be.undefined;
            expect(uploadRow.wellIds.length).to.equal(1);
        });

        it("sets error alert if no wells selected", () => {
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                selection: getMockStateWithHistory({
                    ...nonEmptyStateForInitiatingUpload.selection.present,
                    selectedWells: [],
                }),
            });

            // before
            expect(getAlert(store.getState())).to.be.undefined;

            // apply
            store.dispatch(undoFileWellAssociation("/path/to/file1"));

            // after
            expect(getAlert(store.getState())).to.not.be.undefined;
        });
    });

    describe("applyTemplateLogic", () => {
        it("updates uploads with a templateId", async () => {
            const { logicMiddleware, store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);
            const file1 = "/path1";
            const file2 = "/path2";
            const wellId = 1;

            // before
            const state = store.getState();
            expect(getAppliedTemplateId(state)).to.be.undefined;
            store.dispatch(associateFilesAndWells([{file: file1}, {file: file2}]));

            // apply
            store.dispatch(applyTemplate(1));

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
        const fileRowKey = getUploadRowKey({file});
        const mockChannel = { channelId: 1, description: "", name: ""};

        it("allows positionIndex = 0 to be added", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                store.dispatch(updateScenes(fileRow, [0], []));
            }

            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length + 1);
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
            expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [], [mockChannel]));

                // after
                state = store.getState();
                expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length + 1);
                const channelUpload = getUpload(state)[getUploadRowKey({file, channelId: 1})];
                expect(channelUpload).to.not.be.undefined;
                expect(channelUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: mockChannel,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: getUploadRowKey({file, channelId: 1}),
                    notes: undefined,
                    positionIndex: undefined,
                    wellIds: [],
                    workflows: [],
                });
            }
        });
        it("adds scene-only uploads", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length);
            const fileRow = getUploadSummaryRows(state).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateScenes(fileRow, [1], []));

                // after
                state = store.getState();
                expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length + 1);
                const sceneUpload = getUpload(state)[getUploadRowKey({file, positionIndex: 1})];
                expect(sceneUpload).to.not.be.undefined;
                expect(sceneUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: undefined,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: getUploadRowKey({file, positionIndex: 1}),
                    notes: undefined,
                    positionIndex: 1,
                    wellIds: [],
                    workflows: [],
                });
            }
        });
        it("adds scene+channel uploads", () => {
            const { store } = createMockReduxStore(nonEmptyStateForInitiatingUpload, mockReduxLogicDeps);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(keys(mockWellUpload).length);
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
                expect(keys(uploads).length).to.equal(keys(mockWellUpload).length + 3);
                const sceneUpload = uploads[getUploadRowKey({file, positionIndex: 1})];
                expect(sceneUpload).to.not.be.undefined;
                expect(sceneUpload).to.deep.equal({
                    barcode: fileRow.barcode,
                    channel: undefined,
                    ["Favorite Color"]: undefined,
                    file: fileRow.file,
                    key: getUploadRowKey({file, positionIndex: 1}),
                    notes: undefined,
                    positionIndex: 1,
                    wellIds: [],
                    workflows: [],
                });

                const sceneAndChannelKey = getUploadRowKey({file, positionIndex: 1, channelId: 1});
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
                    workflows: [],
                });
            }
        });
        it("removes uploads that don't exist anymore", () => {
            const sceneKey = getUploadRowKey({file, positionIndex: 1});
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [getUploadRowKey({file})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        wellIds: [],
                    },
                    [getUploadRowKey({file, positionIndex: 1})]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [1],
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
        const uploadRowKey = getUploadRowKey({file: "/path/to/file1"});

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
