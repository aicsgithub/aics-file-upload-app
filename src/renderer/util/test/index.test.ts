import { expect } from "chai";
import { restore } from "sinon";

import {
  alphaOrderComparator,
  convertToArray,
  getPowerOf1000,
  getWellLabel,
  makePosixPathCompatibleWithPlatform,
  splitTrimAndFilter,
} from "../";

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

  describe("alphaOrderComparator", () => {
    it("should return 0 if strings are equal", () => {
      const result = alphaOrderComparator("foo", "foo");
      expect(result).to.equal(0);
    });

    it("should return 1 if a is alphabetically before b", () => {
      const result = alphaOrderComparator("bar", "foo");
      expect(result).to.equal(1);
    });

    it("should return -1 if a is alphabetically after b", () => {
      const result = alphaOrderComparator("foo", "bar");
      expect(result).to.equal(-1);
    });
  });

  describe("convertToArray", () => {
    it("returns an empty array given undefined", () => {
      const result = convertToArray(undefined);
      expect(result).to.deep.equal([]);
    });
    it("returns an empty array given null", () => {
      const result = convertToArray(null);
      expect(result).to.deep.equal([]);
    });
    it("returns an empty array given empty string", () => {
      const result = convertToArray("");
      expect(result).to.deep.equal([]);
    });
    it("returns an array length=1 array given 0", () => {
      const result = convertToArray(0);
      expect(result).to.deep.equal([0]);
    });
    it("returns an array length=1 array given false", () => {
      const result = convertToArray(false);
      expect(result).to.deep.equal([false]);
    });
    it("returns an array if passsed an array", () => {
      const result = convertToArray(["bob"]);
      expect(result).to.deep.equal(["bob"]);
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
