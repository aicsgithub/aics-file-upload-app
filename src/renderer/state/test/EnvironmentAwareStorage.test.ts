import { expect } from "chai";
import Store from "electron-store";
import * as hash from "object-hash";
import { createSandbox, SinonStub, stub } from "sinon";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
} from "../../../shared/constants";
import storage from "../EnvironmentAwareStorage";

describe("EnvironmentAwareStorage", () => {
  const sandbox = createSandbox();
  const prefix = hash.MD5({
    host: LIMS_HOST,
    port: LIMS_PORT,
    protocol: LIMS_PROTOCOL,
    user: DEFAULT_USERNAME,
  });
  const prefixedKey = `${prefix}.foo`;
  afterEach(() => {
    sandbox.restore();
  });

  describe("set", () => {
    const setStub = stub();

    beforeEach(() => {
      sandbox.replace(Store.prototype, "set", setStub);
    });

    it("calls base set method with prefixed key if first arg is a string", () => {
      storage.set("foo", "bar");
      expect(setStub.calledWith(prefixedKey, "bar")).to.be.true;
    });
    it("prefixes keys in object if first arg is object", () => {
      storage.set({ foo: "bar" });
      expect(setStub.calledWithMatch({ [prefixedKey]: "bar" })).to.be.true;
    });
  });
  describe("get", () => {
    const getStub: SinonStub = stub();
    beforeEach(() => {
      sandbox.replace(Store.prototype, "get", getStub);
    });

    it("returns value after prefixing key", () => {
      storage.get("foo");
      expect(getStub.calledWith(prefixedKey)).to.be.true;
    });
    it("passes default value if provided", () => {
      storage.get("foo", "bar");
      expect(getStub.calledWith(prefixedKey, "bar"));
    });
    it("doesn't prefix key if key starts with 'userSettings'", () => {
      storage.get("userSettings.username");
      expect(getStub.calledWith("userSettings.username"));
    });
  });
  describe("delete", () => {
    it("calls base delete method with prefixed key", () => {
      const deleteStub = stub();
      sandbox.replace(Store.prototype, "delete", deleteStub);
      storage.delete("foo");
      expect(deleteStub.calledWith(prefixedKey));
    });
  });
  describe("has", () => {
    it("calls base has method with prefixed key", () => {
      const hasStub = stub();
      sandbox.replace(Store.prototype, "has", hasStub);
      storage.has("foo");
      expect(hasStub.calledWith(prefixedKey));
    });
  });
  describe("reset", () => {
    it("calls base reset method with prefixed keys", () => {
      const resetStub = stub();
      sandbox.replace(Store.prototype, "reset", resetStub);
      storage.reset("foo", "bar");
      expect(resetStub.calledWith(prefixedKey, `${prefix}.bar`));
    });
  });
});
