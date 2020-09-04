import { expect } from "chai";

import { makePosixPathCompatibleWithPlatform } from "../util";

describe("util", () => {
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
});
