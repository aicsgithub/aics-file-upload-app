import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as rimraf from "rimraf";
import {
  createSandbox,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import {
  determineFilesFromNestedPaths,
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  getPowerOf1000,
  splitTrimAndFilter,
} from "../";
import MMSClient from "../../services/mms-client";
import { Template } from "../../services/mms-client/types";
import {
  dialog,
  mockReduxLogicDeps,
} from "../../state/test/configure-mock-store";
import {
  mockBooleanAnnotation,
  mockFavoriteColorTemplateAnnotation,
  mockMMSTemplate,
  mockNumberAnnotation,
} from "../../state/test/mocks";
import {
  ReduxLogicTransformDependencies,
  UploadStateBranch,
} from "../../state/types";
import { getUploadRowKey } from "../../state/upload/constants";
import makePosixPathCompatibleWithPlatform from "../makePosixPathCompatibleWithPlatform";

describe("General utilities", () => {
  const sandbox = createSandbox();
  let mmsClient: SinonStubbedInstance<MMSClient>;
  beforeEach(() => {
    mmsClient = createStubInstance(MMSClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("determineFilesFromNestedPaths", () => {
    const MOCK_DIRECTORY = path.resolve(os.tmpdir(), "fuaMockTest");
    const MOCK_FILE1 = path.resolve(MOCK_DIRECTORY, "first_file.txt");
    const MOCK_FILE2 = path.resolve(MOCK_DIRECTORY, "second_file.txt");

    before(async () => {
      await fs.promises.mkdir(MOCK_DIRECTORY);
      await fs.promises.writeFile(MOCK_FILE1, "some text");
      await fs.promises.writeFile(MOCK_FILE2, "some other text");
      await fs.promises.mkdir(path.resolve(MOCK_DIRECTORY, "unwanted folder"));
    });

    after(() => {
      rimraf.sync(MOCK_DIRECTORY);
    });

    it("returns files as is", async () => {
      // Act
      const result = await determineFilesFromNestedPaths([MOCK_FILE1]);

      // Assert
      expect(result).to.deep.equal([MOCK_FILE1]);
    });

    it("extracts files underneath folders", async () => {
      // Act
      const result = await determineFilesFromNestedPaths([
        MOCK_DIRECTORY,
        MOCK_FILE1,
      ]);

      // Assert
      expect(result).to.deep.equal([MOCK_FILE1, MOCK_FILE2]);
    });
  });

  describe("splitTrimAndFilter", () => {
    it("splits string on commas, trims whitespace", () => {
      const result = splitTrimAndFilter("abc, de ,fg");
      expect(result).to.deep.equal(["abc", "de", "fg"]);
    });
    it("returns empty array give comma", () => {
      const result = splitTrimAndFilter(",");
      expect(result).to.deep.equal([]);
    });
  });

  describe("makePosixPathCompatibleWithPlatform", () => {
    const posixPath = "/arbitrary/path";

    it('doesn\'t change path if platform is "darwin"', () => {
      expect(makePosixPathCompatibleWithPlatform(posixPath, "darwin")).to.equal(
        posixPath
      );
    });
    it('doesn\'t change path if platform is "linux"', () => {
      expect(makePosixPathCompatibleWithPlatform(posixPath, "linux")).to.equal(
        posixPath
      );
    });
    it('updates path if platform is "win32"', () => {
      const expectedPath = "\\arbitrary\\path";
      expect(makePosixPathCompatibleWithPlatform(posixPath, "win32")).to.equal(
        expectedPath
      );
    });
    it('adds additional backward slash if path starts with /allen and platform is "win32"', () => {
      const expectedPath = "\\\\allen\\aics\\sw";
      expect(
        makePosixPathCompatibleWithPlatform("/allen/aics/sw", "win32")
      ).to.equal(expectedPath);
    });
    it('doesn\'t add additional backward slash if path starts with //allen and platform is "win32"', () => {
      const expectedPath = "\\\\allen\\aics\\sw";
      expect(
        makePosixPathCompatibleWithPlatform("//allen/aics/sw", "win32")
      ).to.equal(expectedPath);
    });
  });
  describe("getApplyTemplateInfo", () => {
    let uploads: UploadStateBranch;
    let previouslyAppliedTemplate: Template;
    const key = getUploadRowKey({ file: "/path/to/file1" });
    const template = {
      ...mockMMSTemplate,
      annotations: [
        mockFavoriteColorTemplateAnnotation,
        mockBooleanAnnotation,
        mockNumberAnnotation,
      ],
    };

    beforeEach(() => {
      uploads = {
        [key]: {
          Age: 16,
          "Favorite Color": "red",
          barcode: "1234",
          file: "/path/to/file1",
          key: getUploadRowKey({ file: "/path/to/file" }),
          shouldBeInArchive: true,
          shouldBeInLocal: true,
          wellIds: [1],
        },
      };
      previouslyAppliedTemplate = {
        ...mockMMSTemplate,
        annotations: [
          mockFavoriteColorTemplateAnnotation,
          { ...mockNumberAnnotation, name: "Age" },
        ],
      };
    });

    it("throws error if getTemplate request fails", () => {
      mmsClient.getTemplate.rejects(new Error("Oops"));
      return expect(
        getApplyTemplateInfo(
          1,
          (mmsClient as any) as MMSClient,
          stub(),
          mockBooleanAnnotation.annotationTypeId,
          uploads,
          previouslyAppliedTemplate
        )
      ).to.be.rejectedWith(Error);
    });
    it("returns setAppliedTemplate action with template returned from MMS and expected upload", async () => {
      mmsClient.getTemplate.resolves(template);
      const {
        template: resultTemplate,
        uploads: uploadsResult,
      } = await getApplyTemplateInfo(
        1,
        (mmsClient as any) as MMSClient,
        stub(),
        mockBooleanAnnotation.annotationTypeId,
        uploads,
        previouslyAppliedTemplate
      );
      expect(resultTemplate).to.deep.equal(template);
      // the Age annotation goes away since it's not part of the applied template
      expect(uploadsResult).to.deep.equal({
        [key]: {
          // This annotation got added and is initialized as undefined
          "Clone Number Garbage": [],
          // this stays here because it is part of the template and does not get cleared out
          "Favorite Color": "red",
          // This annotation got added
          Qc: [false],
          barcode: "1234",
          file: "/path/to/file1",
          key: getUploadRowKey({ file: "/path/to/file" }),
          shouldBeInArchive: true,
          shouldBeInLocal: true,
          wellIds: [1],
        },
      });
    });
  });
  describe("ensureDraftGetsSaved", () => {
    const runTest = async (
      skipWarningDialog: boolean,
      showMessageBoxResponse?: number,
      currentUploadFilePath?: string,
      saveFilePath?: string
    ) => {
      const writeFileStub = stub();
      const showMessageBoxStub = stub().resolves({
        response: showMessageBoxResponse,
      });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      const showSaveDialogStub = stub().resolves({ filePath: saveFilePath });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const deps = ({
        ...mockReduxLogicDeps,
        getState: () => ({}),
        writeFile: writeFileStub,
      } as any) as ReduxLogicTransformDependencies;

      const result = await ensureDraftGetsSaved(
        deps,
        true,
        currentUploadFilePath,
        skipWarningDialog
      );
      return { result, showMessageBoxStub, showSaveDialogStub, writeFileStub };
    };
    it("automatically saves draft if user is working on a draft that has previously been saved", async () => {
      const {
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(false, undefined, "/foo");
      expect(writeFileStub.called).to.be.true;
      expect(showMessageBoxStub.called).to.be.false;
      expect(showSaveDialogStub.called).to.be.false;
    });
    it("shows warning dialog if skipWarningDialog is false", async () => {
      const { showMessageBoxStub } = await runTest(false);
      expect(showMessageBoxStub.called).to.be.true;
    });
    it("does not show warning dialog if skipWarningDialog is true and opens save dialog", async () => {
      const { showMessageBoxStub, showSaveDialogStub } = await runTest(true);
      expect(showMessageBoxStub.called).to.be.false;
      expect(showSaveDialogStub.called).to.be.true;
    });
    it("returns { cancelled: false, filePath: undefined } if user chooses to discard draft", async () => {
      const { result, showMessageBoxStub, showSaveDialogStub } = await runTest(
        false,
        1 // discard button index
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });
    it("shows saveDialog and returns { cancelled: false, filePath } with filePath chosen by user", async () => {
      const filePath = "/foo";
      const {
        result,
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(
        false,
        2, // save button index
        undefined,
        filePath
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.true;
      expect(writeFileStub.called).to.be.true;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath,
      });
    });
    it("shows saveDialog and returns { cancelled: false, filePath: undefined } if user decides to cancel saving draft", async () => {
      const {
        result,
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(
        false,
        2, // save button index
        undefined,
        undefined
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.true;
      expect(writeFileStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });
    it("returns { cancelled: true, filePath: undefined } if user clicks Cancel in warning dialog", async () => {
      const { result, showMessageBoxStub, showSaveDialogStub } = await runTest(
        false,
        0 // cancel button index
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: true,
        filePath: undefined,
      });
    });
  });
  describe("getPowerOf1000", () => {
    it("returns 0 if input is 9", () => {
      expect(getPowerOf1000(9)).to.equal(0);
    });
    it("returns 1 if input is 1001", () => {
      expect(getPowerOf1000(1001)).to.equal(1);
    });
    it("returns 1 if input is 999999", () => {
      expect(getPowerOf1000(999999)).to.equal(1);
    });
  });
});
