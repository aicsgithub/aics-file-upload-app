import { expect } from "chai";
import { createStubInstance, stub, restore, SinonStubbedInstance } from "sinon";

import ApplicationInfoService from "../";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";

describe("ApplicationInfoService", () => {
  let applicationInfoService: ApplicationInfoService;
  let httpClient: SinonStubbedInstance<HttpCacheClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV }; // Make a copy
    httpClient = createStubInstance(HttpCacheClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub();

    applicationInfoService = new ApplicationInfoService(
      (httpClient as any) as HttpCacheClient,
      (storage as any) as LocalStorage,
      false
    );
  });

  afterEach(() => {
    process.env = OLD_ENV; // Restore old environment
    restore();
  });

  describe("checkForUpdate", () => {
    it("returns newest and current version upon finding a new version", async () => {
      const newestVersion = "2.3.1";
      const currentVersion = "1.6.2";
      process.env.APPLICATION_VERSION = currentVersion;
      httpClient.get.resolves({
        data: [
          currentVersion,
          newestVersion,
          "2.0.0",
          "0.9.9",
          "1.8.0",
        ].map((name) => ({ name })),
      });

      const result = await applicationInfoService.checkForUpdate();
      expect(result).to.exist;
      expect(result?.currentVersion).to.be.equal(currentVersion);
      expect(result?.newestVersion).to.be.equal(newestVersion);
    });

    it("returns undefined if current version is equal to newest version", async () => {
      const currentVersion = "2.3.1";
      process.env.APPLICATION_VERSION = currentVersion;
      httpClient.get.resolves({
        data: [currentVersion, "2.0.0", "0.9.9", "1.8.0"].map((name) => ({
          name,
        })),
      });

      const result = await applicationInfoService.checkForUpdate();
      expect(result).to.be.undefined;
    });

    it("returns undefined if current version is greater than newest version", async () => {
      const newestVersion = "2.3.1";
      const currentVersion = "2.3.2";
      process.env.APPLICATION_VERSION = currentVersion;
      httpClient.get.resolves({
        data: [
          currentVersion,
          newestVersion,
          "2.0.0",
          "0.9.9",
          "1.8.0",
        ].map((name) => ({ name })),
      });

      const result = await applicationInfoService.checkForUpdate();
      expect(result).to.be.undefined;
    });
  });
});
