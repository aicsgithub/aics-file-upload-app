import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as rimraf from "rimraf";
import { restore } from "sinon";

import {
  determineFilesFromNestedPaths,
  getPowerOf1000,
  makePosixPathCompatibleWithPlatform,
  splitTrimAndFilter,
} from "../";
import { getWellLabel } from "../index";

describe("General utilities", () => {
  afterEach(() => {
    restore();
  });
  describe("getWellLabel", () => {
    it("should display A1 given {row: 0, col: 0}", () => {
      const wellLabel = getWellLabel({ row: 0, col: 0 });
      expect(wellLabel).to.equal("A1");
    });

    it("should display Z14 given {row: 25, col: 13}", () => {
      const wellLabel = getWellLabel({ row: 25, col: 13 });
      expect(wellLabel).to.equal("Z14");
    });

    it("should throw error given {row: -1, col: 0}", () => {
      expect(() => getWellLabel({ row: -1, col: 0 })).to.throw();
    });

    it("should throw error given {row: 0, col: -1}", () => {
      expect(() => getWellLabel({ row: 0, col: -1 })).to.throw();
    });

    it("should throw error given {row: 26, col: 0}", () => {
      expect(() => getWellLabel({ row: 26, col: 0 })).to.throw();
    });

    it("should display None given undefined well", () => {
      const wellLabel = getWellLabel(undefined);
      expect(wellLabel).to.equal("None");
    });

    it("should display custom text given undefined well and custom none text provided", () => {
      const NONE = "Oops";
      const wellLabel = getWellLabel(undefined, NONE);
      expect(wellLabel).to.equal(NONE);
    });
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
