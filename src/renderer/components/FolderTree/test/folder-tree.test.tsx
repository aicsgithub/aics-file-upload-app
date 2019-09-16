import { Tree } from "antd";
import { expect } from "chai";
import { shallow } from "enzyme";
import { resolve } from "path";
import * as React from "react";
import * as sinon from "sinon";

import FolderTree from "../";
import { selection } from "../../../state";
import { setAlert } from "../../../state/feedback/actions";
import { UploadFileImpl } from "../../../state/selection/models/upload-file";
import { UploadFile } from "../../../state/selection/types";

const DirectoryTree = Tree.DirectoryTree;

describe("<FolderTree/>", () => {
    const TEST_DIRNAME = resolve(__dirname);
    const FOLDER_NAME = "demo";
    const ON_CHECK = selection.actions.selectFile;

    let files: UploadFile[] = [];
    let testFolder: UploadFile;
    let testFolderKey: string;

    beforeEach(() => {
        testFolder = new UploadFileImpl(FOLDER_NAME, TEST_DIRNAME, true, true);
        files = [
            testFolder,
        ];
        testFolderKey = FolderTree.getKey(testFolder);
    });

    describe("onExpand", () => {
        it("should not get children if folder has been expanded", (done) => {
            const clearStagedFiles = sinon.fake();
            const getFilesInFolder = sinon.fake();
            const loadFilesFromDragAndDropAction = sinon.fake();
            const loadFilesFromOpenDialogAction = sinon.fake();
            const wrapper = shallow(
                <FolderTree
                    clearStagedFiles={clearStagedFiles}
                    files={files}
                    getFilesInFolder={getFilesInFolder}
                    loadFilesFromDragAndDropAction={loadFilesFromDragAndDropAction}
                    loadFilesFromOpenDialogAction={loadFilesFromOpenDialogAction}
                    onCheck={ON_CHECK}
                    selectedKeys={[]}
                    fileToTags={new Map()}
                    setAlert={setAlert}
                />
            );

            // update
            const expandedFolders: Set<string> = new Set();
            expandedFolders.add(testFolderKey);
            wrapper.setState({
                expandedFolders,
            });
            wrapper.find(DirectoryTree).dive()
                .simulate("expand", [testFolderKey]);

            setTimeout(() => {
                // after
                expect(getFilesInFolder.called).to.equal(false);
                done();
            }, 500);
        });
    });

    describe("getMatchingFolderFromPath", () => {
        it("should return null if files does not contain match", () => {
            const result = FolderTree.getMatchingFolderFromPath(files, "/i-dont-exist");
            expect(result).to.equal(null);
        });

        it("should return folder if it exists at the top level", () => {
            const result = FolderTree.getMatchingFolderFromPath(files, testFolder.fullPath);
            const fullPath = result ? result.fullPath : "";
            expect(fullPath).to.equal(testFolder.fullPath);
        });

        it("should return folder if it exists within another folder", () => {
            const targetFolder = new UploadFileImpl("secrets", testFolder.fullPath, true, true);
            testFolder.files = [
                new UploadFileImpl("animals", testFolder.fullPath, true, true),
                targetFolder,
            ];
            const result = FolderTree.getMatchingFolderFromPath([testFolder], targetFolder.fullPath);
            const fullPath = result ? result.fullPath : "";
            expect(fullPath).to.equal(targetFolder.fullPath);
        });
    });
});
