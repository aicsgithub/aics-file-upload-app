import { expect } from "chai";
import { get, keys } from "lodash";
import * as moment from "moment";
import { createSandbox, stub } from "sinon";

import {
    getAlert,
    getOpenUploadModalVisible,
    getSaveUploadDraftModalVisible,
    getUploadError,
} from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import {
    getCurrentJobIsIncomplete,
    getIncompleteJobNames,
    getNumberOfPendingJobs,
} from "../../job/selectors";
import { getCurrentUpload } from "../../metadata/selectors";
import { getSelectedBarcode, getSelectedFiles } from "../../selection/selectors";
import { getTemplate } from "../../template/actions";
import { createMockReduxStore, fms, mockReduxLogicDeps, storage } from "../../test/configure-mock-store";
import {
    getMockStateWithHistory,
    mockDateAnnotation,
    mockNumberAnnotation, mockState,
    mockTemplateStateBranch,
    mockTemplateWithManyValues,
    mockTextAnnotation,
    nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { State } from "../../types";
import {
    applyTemplate,
    associateFilesAndWells,
    initiateUpload,
    openUploadDraft,
    saveUploadDraft,
    undoFileWellAssociation,
    updateFilesToArchive,
    updateFilesToStoreOnIsilon,
    updateSubImages,
    updateUpload,
} from "../actions";
import { getUploadRowKey } from "../constants";
import {
    getFileToArchive,
    getFileToStoreOnIsilon,
    getUpload,
    getUploadSummaryRows,
} from "../selectors";
import { UpdateSubImagesPayload, UploadJobTableRow } from "../types";

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
            store.dispatch(undoFileWellAssociation({file: "/path/to/file1"}));

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
            store.dispatch(undoFileWellAssociation({file: "/path/to/file1"}, false));

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
            store.dispatch(undoFileWellAssociation({file: "/path/to/file3", positionIndex: 1}, false));

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
            store.dispatch(undoFileWellAssociation({file: "/path/to/file1"}));

            // after
            expect(getAlert(store.getState())).to.not.be.undefined;
        });
    });

    describe("applyTemplateLogic", () => {
        it("calls getTemplate using templateId provided", () => {
            const { actions, store } = createMockReduxStore(nonEmptyStateForInitiatingUpload);

            // before
            expect(actions.includes(getTemplate(1))).to.be.false;

            // apply
            store.dispatch(applyTemplate(1));

            // after
            expect(actions.includes(getTemplate(1))).to.be.false;
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
        it("adds job to incomplete jobs, clears Upload Error, and adds pending job", async () => {
            sandbox.replace(fms, "validateMetadata", stub().resolves());
            sandbox.replace(fms, "uploadFiles", stub().resolves());
            const { logicMiddleware, store } = createMockReduxStore(
                {
                    ...nonEmptyStateForInitiatingUpload,
                    feedback: {
                        ...nonEmptyStateForInitiatingUpload.feedback,
                        uploadError: "foo",
                    },
                },
                mockReduxLogicDeps
            );

            // before
            let state = store.getState();
            expect(getIncompleteJobNames(state)).to.be.empty;
            expect(getUploadError(state)).to.not.be.undefined;
            expect(getNumberOfPendingJobs(state)).to.equal(0);

            // apply
            store.dispatch(initiateUpload());

            // after
            await logicMiddleware.whenComplete();
            state = store.getState();
            expect(getCurrentJobIsIncomplete(state)).to.be.true;
            expect(getUploadError(state)).to.be.undefined;
            expect(getNumberOfPendingJobs(state)).to.equal(1);
        });
        it("sets error alert, removes pending job, updates incomplete job names, and sets upload error" +
            " if upload fails", async () => {
            const error = "bar";
            sandbox.replace(fms, "validateMetadata", stub().resolves());
            sandbox.replace(fms, "uploadFiles", stub().rejects(new Error(error)));
            const { logicMiddleware, store } = createMockReduxStore(
                nonEmptyStateForInitiatingUpload,
                mockReduxLogicDeps
            );

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;
            expect(getUploadError(state)).to.be.undefined;
            expect(getNumberOfPendingJobs(state)).to.equal(0);
            expect(getIncompleteJobNames(state)).to.be.empty;

            // apply
            store.dispatch(initiateUpload());
            await logicMiddleware.whenComplete();

            // after
            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
            expect(getUploadError(state)).to.not.be.undefined;
            expect(getNumberOfPendingJobs(state)).to.equal(0);
            expect(getIncompleteJobNames(state)).to.be.empty;
        });
    });
    describe("updateSubImagesLogic", () => {
        const file = "/path/to/file1";
        const fileRowKey = getUploadRowKey({file});
        let fileRow: UploadJobTableRow | undefined;
        const mockChannel = { channelId: 1, description: "", name: ""};
        let oneFileUploadMockState: State;

        beforeEach(() => {
            oneFileUploadMockState = {
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [fileRowKey]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        key: fileRowKey,
                        shouldBeInArchive: true,
                        shouldBeInLocal: true,
                        wellIds: [1],
                    },
                }),
            };
            fileRow = getUploadSummaryRows(oneFileUploadMockState).find((r) => r.key === fileRowKey);
            expect(fileRow).to.not.be.undefined;
        });

        it("allows positionIndex = 0 to be added", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            // apply
            if (fileRow) {
                store.dispatch(updateSubImages(fileRow, {positionIndexes: [0]}));
            }

            // after
            state = store.getState();
            const upload = getUpload(state);
            expect(keys(upload).length).to.equal(2);
            const filePositionMetadata = upload[getUploadRowKey({file, positionIndex: 0})];
            expect(filePositionMetadata).to.not.be.undefined;
            expect(filePositionMetadata).to.deep.equal({
                "Favorite Color": undefined,
                "barcode": "1234",
                "channel": undefined,
                "file": "/path/to/file1",
                "key": getUploadRowKey({file, positionIndex: 0}),
                "notes": undefined,
                "positionIndex": 0,
                "wellIds": [],
                "workflows": [],
            });
        });

        it("allows scene=0 to be added", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            // apply
            if (fileRow) {
                store.dispatch(updateSubImages(fileRow, {scenes: [0]}));
            }

            // after
            state = store.getState();
            const upload = getUpload(state);
            expect(keys(upload).length).to.equal(2);
            const filePositionMetadata = upload[getUploadRowKey({file, scene: 0})];
            expect(filePositionMetadata).to.not.be.undefined;
            expect(filePositionMetadata).to.deep.equal({
                "Favorite Color": undefined,
                "barcode": "1234",
                "channel": undefined,
                "file": "/path/to/file1",
                "key": getUploadRowKey({file, scene: 0}),
                "notes": undefined,
                "scene": 0,
                "wellIds": [],
                "workflows": [],
            });
        });

        it("does not remove well associations from the file row if adding a channel", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {channels: [mockChannel]}));
            }

            // after
            state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;
        });

        it("removes well associations from the file row if adding a position index", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {positionIndexes: [1]}));
            }

            // after
            state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.be.empty;
        });

        it("removes well associations from file row if adding a scene", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {scenes: [1]}));
            }

            // after
            state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.be.empty;
        });

        it("removes well associations from file row if adding a sub image name", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.not.be.empty;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {subImageNames: ["foo"]}));
            }

            // after
            state = store.getState();
            expect(getUpload(state)[fileRowKey].wellIds).to.be.empty;
        });

        it("adds 1 sub row to file if only channel provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);
            const channelOnlyRowKey = getUploadRowKey({file, channelId: mockChannel.channelId});

            // before
            let state = store.getState();
            let uploadRowKeys = keys(getUpload(state));
            expect(uploadRowKeys.length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {channels: [mockChannel]}));
            }

            // after
            state = store.getState();
            uploadRowKeys = keys(getUpload(state));
            expect(uploadRowKeys.length).to.equal(2);
            expect(getUpload(state)[fileRowKey]).to.not.be.undefined;
            // look for row we expect to get added
            const channelUpload = getUpload(state)[channelOnlyRowKey];
            expect(channelUpload).to.not.be.undefined;
            expect(channelUpload).to.deep.equal({
                barcode:  "1234",
                channel: mockChannel,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, channelId: 1}),
                notes: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                wellIds: [],
                workflows: [],
            });
        });

        it("adds 1 sub row to file if only position provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {positionIndexes: [1]}));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(2);
            const positionUpload = getUpload(state)[getUploadRowKey({file, positionIndex: 1})];
            expect(positionUpload).to.not.be.undefined;
            expect(positionUpload).to.deep.equal({
                barcode: "1234",
                channel: undefined,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, positionIndex: 1}),
                notes: undefined,
                positionIndex: 1,
                wellIds: [],
                workflows: [],
            });
        });

        it("adds 1 sub row to file if only scene provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {scenes: [1]}));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(2);
            const sceneUpload = getUpload(state)[getUploadRowKey({file, scene: 1})];
            expect(sceneUpload).to.not.be.undefined;
            expect(sceneUpload).to.deep.equal({
                barcode: "1234",
                channel: undefined,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, scene: 1}),
                notes: undefined,
                scene: 1,
                wellIds: [],
                workflows: [],
            });
        });

        it("adds 1 sub row to file if only sub image name provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {subImageNames: ["foo"]}));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(2);
            const subImageUpload = getUpload(state)[getUploadRowKey({file, subImageName: "foo"})];
            expect(subImageUpload).to.not.be.undefined;
            expect(subImageUpload).to.deep.equal({
                barcode: "1234",
                channel: undefined,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, subImageName: "foo"}),
                notes: undefined,
                subImageName: "foo",
                wellIds: [],
                workflows: [],
            });
        });

        it("adds all channels provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);
            expect(getUpload(state)[getUploadRowKey({file, channelId: 1})]).to.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, channelId: 2})]).to.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {
                    channels: [
                        mockChannel,
                        { ...mockChannel, channelId: 2},
                    ],
                }));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            expect(getUpload(state)[getUploadRowKey({file, channelId: 1})]).to.not.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, channelId: 2})]).to.not.be.undefined;
        });

        it("adds all positions provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);
            expect(getUpload(state)[getUploadRowKey({file, positionIndex: 1})]).to.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, positionIndex: 2})]).to.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {positionIndexes: [1, 2]}));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            expect(getUpload(state)[getUploadRowKey({file, positionIndex: 1})]).to.not.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, positionIndex: 2})]).to.not.be.undefined;
        });

        it("adds all scenes provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);
            expect(getUpload(state)[getUploadRowKey({file, scene: 1})]).to.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, scene: 2})]).to.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {scenes: [1, 2]}));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            expect(getUpload(state)[getUploadRowKey({file, scene: 1})]).to.not.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, scene: 2})]).to.not.be.undefined;
        });

        it("adds all sub image names provided", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);
            expect(getUpload(state)[getUploadRowKey({file, subImageName: "foo"})]).to.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, subImageName: "bar"})]).to.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {subImageNames: ["foo", "bar"]}));
            }

            // after
            state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(3);
            expect(getUpload(state)[getUploadRowKey({file, subImageName: "foo"})]).to.not.be.undefined;
            expect(getUpload(state)[getUploadRowKey({file, subImageName: "bar"})]).to.not.be.undefined;
        });

        const testBadRequest = (update: Partial<UpdateSubImagesPayload>) => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, update));
            }

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        };

        it("sets alert if there are positions and scenes", () => {
            testBadRequest({
                positionIndexes: [1],
                scenes: [1],
            });
        });

        it("sets alert if there are positions and subimagenames", () => {
            testBadRequest({
                positionIndexes: [1],
                subImageNames: ["foo"],
            });
        });

        it("sets alert if there are scenes and subimagenames", () => {
            testBadRequest({
                scenes: [1],
                subImageNames: ["foo"],
            });
        });

        it("handles position+channel uploads", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {positionIndexes: [1], channels: [mockChannel]}));
            }

            // after
            state = store.getState();
            const uploads = getUpload(state);
            expect(keys(uploads).length).to.equal(4);
            const positionUpload = uploads[getUploadRowKey({file, positionIndex: 1})];
            expect(positionUpload).to.deep.equal({
                barcode: "1234",
                channel: undefined,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, positionIndex: 1}),
                notes: undefined,
                positionIndex: 1,
                wellIds: [],
                workflows: [],
            });

            const positionAndChannelKey = getUploadRowKey({file, positionIndex: 1, channelId: 1});
            const positionAndChannelUpload = uploads[positionAndChannelKey];
            expect(positionAndChannelUpload).to.not.be.undefined;
            expect(positionAndChannelUpload).to.deep.equal({
                barcode: "1234",
                channel: mockChannel,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: positionAndChannelKey,
                notes: undefined,
                positionIndex: 1,
                wellIds: [],
                workflows: [],
            });
        });

        it("handles scene+channel uploads", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {scenes: [1], channels: [mockChannel]}));
            }

            // after
            state = store.getState();
            const uploads = getUpload(state);
            expect(keys(uploads).length).to.equal(4);
            const sceneUpload = uploads[getUploadRowKey({file, scene: 1})];
            expect(sceneUpload).to.deep.equal({
                barcode: "1234",
                channel: undefined,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, scene: 1}),
                notes: undefined,
                scene: 1,
                wellIds: [],
                workflows: [],
            });

            const sceneAndChannelKey = getUploadRowKey({file, scene: 1, channelId: 1});
            const sceneAndChannelUpload = uploads[sceneAndChannelKey];
            expect(sceneAndChannelUpload).to.not.be.undefined;
            expect(sceneAndChannelUpload).to.deep.equal({
                barcode: "1234",
                channel: mockChannel,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: sceneAndChannelKey,
                notes: undefined,
                scene: 1,
                wellIds: [],
                workflows: [],
            });
        });

        it("handles subImageName+channel uploads", () => {
            const { store } = createMockReduxStore(oneFileUploadMockState);

            // before
            let state = store.getState();
            expect(keys(getUpload(state)).length).to.equal(1);

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {subImageNames: ["foo"], channels: [mockChannel]}));
            }

            // after
            state = store.getState();
            const uploads = getUpload(state);
            expect(keys(uploads).length).to.equal(4);
            const positionUpload = uploads[getUploadRowKey({file, subImageName: "foo"})];
            expect(positionUpload).to.deep.equal({
                barcode: "1234",
                channel: undefined,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: getUploadRowKey({file, subImageName: "foo"}),
                notes: undefined,
                subImageName: "foo",
                wellIds: [],
                workflows: [],
            });

            const positionAndChannelKey = getUploadRowKey({file, subImageName: "foo", channelId: 1});
            const positionAndChannelUpload = uploads[positionAndChannelKey];
            expect(positionAndChannelUpload).to.not.be.undefined;
            expect(positionAndChannelUpload).to.deep.equal({
                barcode: "1234",
                channel: mockChannel,
                ["Favorite Color"]: undefined,
                file: "/path/to/file1",
                key: positionAndChannelKey,
                notes: undefined,
                subImageName: "foo",
                wellIds: [],
                workflows: [],
            });
        });

        it("removes uploads that don't exist anymore", () => {
            const position1Key = getUploadRowKey({file, positionIndex: 1});
            const position1Channel1Key = getUploadRowKey({file, positionIndex: 1, channelId: 1});
            const position2Key = getUploadRowKey({file, positionIndex: 2});
            const position2Channel1Key = getUploadRowKey({file, positionIndex: 2, channelId: 1});
            const { store } = createMockReduxStore({
                ...nonEmptyStateForInitiatingUpload,
                upload: getMockStateWithHistory({
                    [fileRowKey]: {
                        barcode: "1234",
                        channelIds: [1],
                        file: "/path/to/file1",
                        positionIndexes: [1, 2],
                        wellIds: [],
                    },
                    [position1Key]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [1],
                    },
                    [position1Channel1Key]: {
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        positionIndex: 1,
                        wellIds: [],
                    },
                    [position2Key]: {
                        barcode: "1234",
                        file: "/path/to/file1",
                        positionIndex: 2,
                        wellIds: [2],
                    },
                    [position2Channel1Key]: {
                        barcode: "1234",
                        channel: mockChannel,
                        file: "/path/to/file1",
                        positionIndex: 2,
                        wellIds: [],
                    },
                }),
            }, mockReduxLogicDeps);

            // before
            const state = store.getState();
            expect(getUpload(state)[position1Key]).to.not.be.undefined;

            if (fileRow) {
                // apply
                store.dispatch(updateSubImages(fileRow, {scenes: [1, 2], channels: [mockChannel]}));
                const uploads = getUpload(store.getState());
                expect(uploads[position1Key]).to.be.undefined;
                expect(uploads[position1Channel1Key]).to.be.undefined;
                expect(uploads[position2Key]).to.be.undefined;
                expect(uploads[position2Channel1Key]).to.be.undefined;
                expect(uploads[getUploadRowKey({file, scene: 1})]).to.not.be.undefined;
                expect(uploads[getUploadRowKey({file, scene: 1, channelId: 1})]).to.not.be.undefined;
                expect(uploads[getUploadRowKey({file, scene: 2})]).to.not.be.undefined;
                expect(uploads[getUploadRowKey({file, scene: 2, channelId: 1})]).to.not.be.undefined;
            }
        });

        it("removes scenes if subimagenames used instead", () => {
            const scene1RowKey = getUploadRowKey({file, scene: 1});
            const scene1Channel1RowKey = getUploadRowKey({file, scene: 1, channelId: 1});
            const channel1RowKey = getUploadRowKey({file, channelId: 1});

            const { store } = createMockReduxStore(oneFileUploadMockState);

            let upload;
            if (fileRow) {
                // before
                store.dispatch(updateSubImages(fileRow, {scenes: [1], channels: [mockChannel]}));
                upload = getUpload(store.getState());
                expect(upload[scene1RowKey]).to.not.be.undefined;
                expect(upload[scene1Channel1RowKey]).to.not.be.undefined;
                expect(upload[channel1RowKey]).to.not.be.undefined;

                // apply
                store.dispatch(updateSubImages(fileRow, {subImageNames: ["foo"], channels: [mockChannel]}));
            }

            upload = getUpload(store.getState());
            expect(upload[scene1RowKey]).to.be.undefined;
            expect(upload[scene1Channel1RowKey]).to.be.undefined;
            expect(upload[channel1RowKey]).to.not.be.undefined;

            const fooRowKey = getUploadRowKey({file, subImageName: "foo"});
            const fooChannel1RowKey = getUploadRowKey({file, subImageName: "foo", channelId: 1});
            expect(fooRowKey).to.not.be.undefined;
            expect(fooChannel1RowKey).to.not.be.undefined;
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
    describe("saveUploadDraftLogic", () => {
        it("sets error alert if upload is empty", async () => {
            const { store, logicMiddleware } = createMockReduxStore({
                ...mockState,
                upload: getMockStateWithHistory({}),
            });

            // before
            expect(getAlert(store.getState())).to.be.undefined;

            // apply
            store.dispatch(saveUploadDraft("test"));
            await logicMiddleware.whenComplete();

            // after
            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;
            if (alert) {
                expect(alert.type).to.equal(AlertType.ERROR);
                expect(alert.message).to.equal("Nothing to save");
            }
        });
        it("sets error alert if a draftName cannot be resolved", async () => {
            const { store, logicMiddleware } = createMockReduxStore(mockState);

            // before
            expect(getAlert(store.getState())).to.be.undefined;

            // apply
            store.dispatch(saveUploadDraft(" "));
            await logicMiddleware.whenComplete();

            // after
            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;
            if (alert) {
                expect(alert.type).to.equal(AlertType.ERROR);
                expect(alert.message).to.equal("Draft name cannot be empty");
            }
        });
        it("sets current upload", async () => {
            const { store, logicMiddleware } = createMockReduxStore(mockState);

            // before
            expect(getCurrentUpload(store.getState())).to.be.undefined;
            // apply
            store.dispatch(saveUploadDraft("test"));
            await logicMiddleware.whenComplete();

            // after
            const currentUpload = getCurrentUpload(store.getState());
            expect(getCurrentUpload(store.getState())).to.not.be.undefined;
            if (currentUpload) {
                expect(currentUpload.name).to.equal("test");
            }
        });
    });
    describe("openUploadLogic", () => {
        const sandbox = createSandbox();

        afterEach(() => {
            sandbox.restore();
        });

        it("sets error alert if local storage does not contain draft", async () => {
            const storageGetStub = stub().returns(undefined);
            sandbox.replace(storage, "get", storageGetStub);
            const { store, logicMiddleware } = createMockReduxStore(mockState);

            // before
            expect(getAlert(store.getState())).to.be.undefined;

            // apply
            store.dispatch(openUploadDraft("test"));
            await logicMiddleware.whenComplete();

            // after
            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;
            if (alert) {
                expect(alert.type).to.equal(AlertType.ERROR);
                expect(alert.message).to.equal("Could not find draft named test");
            }
        });
        it("opens saveUploadDraft modal if a user is currently working on an upload", async () => {
            const storageGetStub = stub().returns({
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    name: "test",
                },
                state: mockState,
            });
            sandbox.replace(storage, "get", storageGetStub);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                feedback: {
                    ...mockState.feedback,
                    visibleModals: ["openUpload"],
                },
            });

            // before
            expect(getOpenUploadModalVisible(store.getState())).to.be.true;
            expect(getSaveUploadDraftModalVisible(store.getState())).to.be.false;

            // apply
            store.dispatch(openUploadDraft("test"));
            await logicMiddleware.whenComplete();

            // after
            expect(getOpenUploadModalVisible(store.getState())).to.be.false;
            expect(getSaveUploadDraftModalVisible(store.getState())).to.be.true;
         });
        it("closes openUpload modal if nothing to save", async () => {
            const storageGetStub = stub().returns({
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    name: "test",
                },
                state: mockState,
            });
            sandbox.replace(storage, "get", storageGetStub);
            const { logicMiddleware, store } = createMockReduxStore({
                ...mockState,
                feedback: {
                    ...mockState.feedback,
                    visibleModals: ["openUpload"],
                },
                upload: getMockStateWithHistory({}),
            });

            // before
            expect(getOpenUploadModalVisible(store.getState())).to.be.true;

            // apply
            store.dispatch(openUploadDraft("test"));
            await logicMiddleware.whenComplete();

            // after
            expect(getOpenUploadModalVisible(store.getState())).to.be.false;
            expect(getSaveUploadDraftModalVisible(store.getState())).to.be.false;
        });
    });
});
