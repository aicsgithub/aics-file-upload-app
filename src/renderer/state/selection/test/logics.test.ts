import { AxiosError } from "axios";
import { expect } from "chai";
import { isEmpty } from "lodash";
import { dirname, resolve } from "path";
import { StateWithHistory } from "redux-undo";
import * as sinon from "sinon";
import { createSandbox } from "sinon";

import selections from "../";

import { feedback } from "../../";
import { API_WAIT_TIME_SECONDS } from "../../constants";
import { getAlert, getRequestsInProgressContains } from "../../feedback/selectors";
import { AlertType, AppAlert, AsyncRequest } from "../../feedback/types";
import { createMockReduxStore, mmsClient, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { getMockStateWithHistory, mockAuditInfo, mockSelection, mockState } from "../../test/mocks";
import { HTTP_STATUS } from "../../types";
import { selectBarcode } from "../actions";
import { GENERIC_GET_WELLS_ERROR_MESSAGE, MMS_IS_DOWN_MESSAGE, MMS_MIGHT_BE_DOWN_MESSAGE } from "../logics";
import { UploadFileImpl } from "../models/upload-file";
import { getPage, getSelectedBarcode, getSelectedPlateId, getWells } from "../selectors";
import {
    DragAndDropFileList,
    GetPlateResponse,
    Page,
    PlateResponse,
    SelectionStateBranch,
    UploadFile,
    Well
} from "../types";

describe("Selection logics", () => {
    const sandbox = createSandbox();
    const FILE_NAME = "cells.txt";
    const TEST_FILES_DIR = "files";
    const FOLDER_NAME = "a_directory";
    const FILE_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FILE_NAME);
    const FOLDER_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FOLDER_NAME);
    const EXPECTED_FILE_INDEX = 0;
    const EXPECTED_FOLDER_INDEX = 1;

    const testStagedFilesCreated = (stagedFiles: UploadFile[]) => {
        const file = stagedFiles[EXPECTED_FILE_INDEX];
        expect(file.isDirectory).to.equal(false);
        expect(file.name).to.equal(FILE_NAME);
        expect(file.path).to.equal(resolve(__dirname, TEST_FILES_DIR));
        expect(file.fullPath).to.equal(FILE_FULL_PATH);

        const folder = stagedFiles[EXPECTED_FOLDER_INDEX];
        expect(folder.isDirectory).to.equal(true);
        expect(folder.name).to.equal(FOLDER_NAME);
        expect(folder.path).to.equal(resolve(__dirname, TEST_FILES_DIR));
        expect(folder.fullPath).to.equal(FOLDER_FULL_PATH);
        expect(folder.files.length).to.equal(2);
    };

    afterEach(() => {
        sandbox.restore();
    });

    describe("loadFilesLogic", () => {
        let fileList: DragAndDropFileList;

        beforeEach(() => {
            // a FileList (https://developer.mozilla.org/en-US/docs/Web/API/FileList) does not have a constructor
            // and must implement some iterator methods. For the purposes of keeping these tests simple, we're casting
            // it twice to make the transpiler happy.
            fileList = {
                length: 2,
                0: {
                    name: FILE_NAME,
                    path: FILE_FULL_PATH,
                },
                1: {
                    name: FOLDER_NAME,
                    path: FOLDER_FULL_PATH,
                },
            };
        });

        it("Goes to EnterBarcode page if on DragAndDrop page", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(selections.selectors.getPage(store.getState())).to.equal(Page.DragAndDrop);

            // apply
            store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

            // after
            store.subscribe(() => {
                expect(selections.selectors.getPage(store.getState())).to.equal(Page.EnterBarcode);
                done();
            });
        });

        it("Does not change page if not on DragAndDrop page", (done) => {
            const selection: StateWithHistory<SelectionStateBranch> = getMockStateWithHistory({
                ...mockSelection,
                page: Page.EnterBarcode,
            });
            const store = createMockReduxStore({
                ...mockState,
                selection,
            });

            // before
            expect(selections.selectors.getPage(store.getState())).to.equal(Page.EnterBarcode);

            // apply
            store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

            // after
            store.subscribe(() => {
                expect(selections.selectors.getPage(store.getState())).to.equal(Page.EnterBarcode);
                done();
            });
        });

        it("stages all files loaded", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(selections.selectors.getStagedFiles(store.getState()).length).to.equal(0);

            // apply
            store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

            store.subscribe(() => {
                // after
                const stagedFiles = selections.selectors.getStagedFiles(store.getState());
                expect(stagedFiles.length === fileList.length).to.be.true;
                // expect(stagedFiles.length).to.equal(fileList.length);

                testStagedFilesCreated(stagedFiles);
                done();
            });
        });

        it ("should stop loading on success", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

            // apply
            store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

            store.subscribe(() => {
                // after
                expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
                done();
            });
        });

        it ("should stop loading on error", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

            // apply
            fileList = {
                length: 2,
                0: {
                    name: "does_not_exist.txt",
                    path: FILE_FULL_PATH,
                },
                1: {
                    name: FOLDER_NAME,
                    path: FOLDER_FULL_PATH,
                },
            };
            store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

            store.subscribe(() => {
                // after
                expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
                done();
            });
        });
    });

    describe("openFilesLogic", () => {
        let filePaths: string[];

        beforeEach(() => {
            filePaths = [FILE_FULL_PATH, FOLDER_FULL_PATH];
        });

        it("Goes to EnterBarcode page if on DragAndDrop page", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(selections.selectors.getPage(store.getState())).to.equal(Page.DragAndDrop);

            // apply
            store.dispatch(selections.actions.openFilesFromDialog(filePaths));

            // after
            store.subscribe(() => {
                expect(selections.selectors.getPage(store.getState())).to.equal(Page.EnterBarcode);
                done();
            });
        });

        it("Does not change page if not on DragAndDrop page", (done) => {
            const selection: StateWithHistory<SelectionStateBranch> = getMockStateWithHistory({
                ...mockSelection,
                page: Page.EnterBarcode,
            });
            const store = createMockReduxStore({
                ...mockState,
                selection,
            });

            // before
            expect(selections.selectors.getPage(store.getState())).to.equal(Page.EnterBarcode);

            // apply
            store.dispatch(selections.actions.openFilesFromDialog(filePaths));

            // after
            store.subscribe(() => {
                expect(selections.selectors.getPage(store.getState())).to.equal(Page.EnterBarcode);
                done();
            });
        });

        it("Stages all files opened", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(selections.selectors.getStagedFiles(store.getState()).length).to.equal(0);

            // apply
            store.dispatch(selections.actions.openFilesFromDialog(filePaths));

            store.subscribe(() => {
                // after
                const stagedFiles = selections.selectors.getStagedFiles(store.getState());
                expect(stagedFiles.length).to.equal(filePaths.length);

                testStagedFilesCreated(stagedFiles);
                done();
            });
        });

        it("Removes child files or directories", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(selections.selectors.getStagedFiles(store.getState()).length).to.equal(0);

            // apply
            const filePathsWithDuplicates = [
                resolve(FOLDER_FULL_PATH, "test.txt"),
                FOLDER_FULL_PATH,
                resolve(FOLDER_FULL_PATH, "test2.txt"),
            ];
            store.dispatch(selections.actions.openFilesFromDialog(filePathsWithDuplicates));

            store.subscribe(() => {
                // after
                const stagedFiles = selections.selectors.getStagedFiles(store.getState());
                expect(stagedFiles.length).to.equal(1);
                expect(stagedFiles[0].isDirectory).to.equal(true);
                expect(stagedFiles[0].path).to.equal(dirname(FOLDER_FULL_PATH));
                expect(stagedFiles[0].name).to.equal(FOLDER_NAME);
                done();
            });
        });

        it ("should stop loading on success", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

            // apply
            store.dispatch(selections.actions.openFilesFromDialog(filePaths));

            store.subscribe(() => {
                // after
                expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
                done();
            });
        });

        it ("should stop loading on error", (done) => {
            const store = createMockReduxStore(mockState);

            // before
            expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

            // apply
            filePaths = [resolve(__dirname, TEST_FILES_DIR, "does_not_exist.txt")];
            store.dispatch(selections.actions.openFilesFromDialog(filePaths));

            store.subscribe(() => {
                // after
                expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
                done();
            });
        });
    });

    describe("getFilesInFolderLogic", () => {
        it("should add child files to folder", (done) => {
            const folder = new UploadFileImpl(FOLDER_NAME, dirname(FOLDER_FULL_PATH), true, true);
            const stagedFiles = [
                new UploadFileImpl(FILE_NAME, dirname(FILE_FULL_PATH), false, true),
                folder,
            ];
            const selection: StateWithHistory<SelectionStateBranch> = getMockStateWithHistory({
                ...mockSelection,
                stagedFiles,
            });
            const store = createMockReduxStore({
                ...mockState,
                selection,
            });

            // before
            const stagedFilesBefore = selections.selectors.getStagedFiles(store.getState());
            expect(isEmpty(stagedFilesBefore[EXPECTED_FOLDER_INDEX].files)).to.equal(true);

            // apply
            store.dispatch(selections.actions.getFilesInFolder(folder));

            store.subscribe(() => {
                // after
                const stagedFilesAfter = selections.selectors.getStagedFiles(store.getState());
                const stagedFolder = stagedFilesAfter[EXPECTED_FOLDER_INDEX];
                expect(stagedFolder.files.length).to.equal(2);

                const stagedFolderContainsSecretsFolder = !!stagedFolder.files.find((file) => {
                    return file.name === "secrets" &&
                        file.path === FOLDER_FULL_PATH &&
                        file.isDirectory;
                });
                expect(stagedFolderContainsSecretsFolder).to.equal(true);

                const stagedFolderContainsTxtFile = !!stagedFolder.files.find((file) => {
                    return file.name === "more_cells.txt" &&
                        file.path === FOLDER_FULL_PATH &&
                        !file.isDirectory;
                });
                expect(stagedFolderContainsTxtFile).to.equal(true);
                done();
            });
        });
    });

    describe("selectBarcodeLogic", () => {
        const barcode = "1234";
        const plateId = 1;
        let mockOkGetPlateResponse: GetPlateResponse;
        let mockBadGatewayResponse: AxiosError;

        beforeEach(() => {
            const mockEmptyWell: Well = {
                cellPopulations: [],
                col: 0,
                row: 0,
                solutions: [],
                wellId: 1,
            };
            const mockPlate: PlateResponse = {
                ...mockAuditInfo,
                barcode: "123456",
                comments: "",
                imagingSessionId: 1,
                plateGeometryId: 1,
                plateId: 1,
                plateStatusId: 1,
                seededOn: "2018-02-14 23:03:52",
            };
            mockOkGetPlateResponse = {
                plate: mockPlate,
                wells: [mockEmptyWell],
            };
            mockBadGatewayResponse = {
                config: {},
                isAxiosError: true,
                message: "Bad Gateway",
                name: "",
                response: {
                    config: {},
                    data: [],
                    headers: {},
                    status: HTTP_STATUS.BAD_GATEWAY,
                    statusText: "Bad Gateway",
                },
            };
        });

        it("Adds GET wells request to requests in progress", (done) => {
            const getStub = sinon.stub().onFirstCall().resolves(mockOkGetPlateResponse);
            sandbox.replace(mmsClient, "getPlate", getStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            expect(getRequestsInProgressContains(store.getState(), AsyncRequest.GET_PLATE)).to.be.false;
            let storeUpdates = 0;
            store.subscribe(() => {
                storeUpdates++;

                if (storeUpdates === 1) {
                    const state = store.getState();
                    expect(getRequestsInProgressContains(state, AsyncRequest.GET_PLATE)).to.be.true;
                    done();
                }
            });

            store.dispatch(selectBarcode(barcode));
        });

        it ("removes GET wells from requests in progress if GET wells is OK", (done) => {
            const getStub = sinon.stub().onFirstCall().callsFake(() => {
                store.subscribe(() => {
                    expect(getRequestsInProgressContains(store.getState(), AsyncRequest.GET_PLATE)).to.be.false;
                    done();
                });
                return Promise.resolve(mockOkGetPlateResponse);
            });
            sandbox.replace(mmsClient, "getPlate", getStub);

            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            store.dispatch(selectBarcode(barcode));
        });

        it("Sets wells, page, barcode, and plateId if GET wells is OK", (done) => {
            const getStub = sinon.stub().onFirstCall().callsFake(() => {
                // we add the subscription after the first store.dispatch because we're testing
                // the process callback which gets called after the first store update
                store.subscribe(() => {
                    const state = store.getState();
                    expect(getWells(state)).to.not.be.empty;
                    expect(getPage(state)).to.equal(Page.AssociateFiles);
                    expect(getSelectedBarcode(state)).to.equal(barcode);
                    expect(getSelectedPlateId(state)).to.equal(plateId);
                    done();
                });

                return Promise.resolve(mockOkGetPlateResponse);
            });
            sandbox.replace(mmsClient, "getPlate", getStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            store.dispatch(selectBarcode(barcode));
        });

        it("Does not retry GET wells request if response is non-Bad Gateway error", (done) => {
            const getStub = sinon.stub().onFirstCall().callsFake(() => {
                store.subscribe(() => {
                    const state = store.getState();
                    expect(getRequestsInProgressContains(state, AsyncRequest.GET_PLATE)).to.be.false;
                    expect(getStub.callCount).to.equal(1);

                    const alert = getAlert(state);
                    expect(alert).to.not.be.undefined;

                    if (alert) {
                        expect(alert.type).to.equal(AlertType.ERROR);
                        expect(alert.message).to.equal(GENERIC_GET_WELLS_ERROR_MESSAGE(barcode));
                    }

                    done();
                });

                return Promise.reject({
                    ...mockOkGetPlateResponse,
                    status: HTTP_STATUS.BAD_REQUEST,
                });
            });
            sandbox.replace(mmsClient, "getPlate", getStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            store.dispatch(selectBarcode(barcode));
        });

        it("Shows error message if it only receives Bad Gateway error for 20 seconds", function(done) {
            // here we're using a fake clock so that 20 seconds passes more quickly and to give control
            // over to the test in terms of timing.
            this.clock = sinon.useFakeTimers((new Date()).getTime());

            // extends timeout for this test since we're testing a potentially long running process
            const waitTime = API_WAIT_TIME_SECONDS * 1000 + 3000;
            this.timeout(waitTime);

            let secondsPassed = 0;
            const incrementMs = 5000;

            let firstAlert: AppAlert | undefined;

            // increment clock on every get call by 5 seconds
            const getStub = sinon.stub().callsFake(() => {
                this.clock.tick(incrementMs);
                secondsPassed += incrementMs / 1000;

                if (!firstAlert) {
                    firstAlert = getAlert(store.getState());
                }

                return Promise.reject(mockBadGatewayResponse);
            });
            sandbox.replace(mmsClient, "getPlate", getStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            store.subscribe(() => {
                if (secondsPassed >= API_WAIT_TIME_SECONDS) {
                    const state = store.getState();
                    const currentAlert: AppAlert | undefined = getAlert(state);
                    expect(getStub.callCount).to.be.greaterThan(1);
                    expect(firstAlert).to.not.be.undefined;

                    if (firstAlert) {
                        expect(firstAlert.type).to.equal(AlertType.WARN);
                        expect(firstAlert.message).to.equal(MMS_MIGHT_BE_DOWN_MESSAGE);
                    }

                    expect(currentAlert).to.not.be.undefined;

                    if (currentAlert) {
                        expect(currentAlert.type).to.equal(AlertType.ERROR);
                        expect(currentAlert.message).to.equal(MMS_IS_DOWN_MESSAGE);
                    }

                    done();
                }
            });

            store.dispatch(selectBarcode(barcode));
        });

        it("Can handle successful response after retrying GET wells request", function(done) {
            this.timeout(API_WAIT_TIME_SECONDS * 1000 + 3000);
            let okResponseReturned = false;
            const getStub = sinon.stub()
                .onFirstCall().rejects(mockBadGatewayResponse)
                .onSecondCall().callsFake(() => {
                    okResponseReturned = true;
                    return Promise.resolve(mockOkGetPlateResponse);
                });
            sandbox.replace(mmsClient, "getPlate", getStub);
            const store = createMockReduxStore(mockState, mockReduxLogicDeps);

            store.subscribe(() => {
                if (okResponseReturned) {
                    const state = store.getState();
                    expect(getWells(state)).to.not.be.empty;
                    expect(getPage(state)).to.equal(Page.AssociateFiles);
                    expect(getSelectedBarcode(state)).to.equal(barcode);
                    expect(getSelectedPlateId(state)).to.equal(plateId);
                    okResponseReturned = false; // prevent more calls to done
                    done();
                }
            });
            store.dispatch(selectBarcode(barcode));
        });
    });
});
