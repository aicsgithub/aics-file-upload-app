import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import {
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
} from "../../../../shared/constants";
import { storage } from "../../../state/test/configure-mock-store";
import { HttpClient } from "../../types";
import HttpCacheClient from "../index";

describe("HttpCacheClient", () => {
  const sandbox = createSandbox();
  const url = "/foo";
  const limsURL = `${LIMS_PROTOCOL}://${LIMS_HOST}:${LIMS_PORT}`;
  const data = [{}];
  const response = { data };
  const getStub = stub().resolves(response);
  const postStub = stub().resolves(response);
  const putStub = stub().resolves(response);
  const patchStub = stub().resolves(response);
  const deleteStub = stub().resolves(response);
  const storageGetStub = stub();
  const httpClient = ({
    get: getStub,
    post: postStub,
    put: putStub,
    patch: patchStub,
    delete: deleteStub,
  } as any) as HttpClient;

  afterEach(() => {
    sandbox.restore();
  });
  it("doesn't use cache if useCache is false", async () => {
    sandbox.replace(storage, "get", storageGetStub);
    const httpCacheClient = new HttpCacheClient(httpClient, false, storage);
    await httpCacheClient.get(url);
    await httpCacheClient.post(url, {});
    await httpCacheClient.put(url, {});
    await httpCacheClient.patch(url, {});
    await httpCacheClient.delete(url, {});
    expect(storageGetStub.calledWith(`GET ${limsURL}${url}`)).to.be.false;
    expect(storageGetStub.calledWith(`POST ${limsURL}${url}`)).to.be.false;
    expect(storageGetStub.calledWith(`PUT ${limsURL}${url}`)).to.be.false;
    expect(storageGetStub.calledWith(`PATCH ${limsURL}${url}`)).to.be.false;
    expect(storageGetStub.calledWith(`DELETE ${limsURL}${url}`)).to.be.false;
  });
  it("uses cache if useCache is true", async () => {
    sandbox.replace(storage, "get", storageGetStub);
    const httpCacheClient = new HttpCacheClient(httpClient, true, storage);
    await httpCacheClient.get(url);
    await httpCacheClient.post(url, {});
    await httpCacheClient.put(url, {});
    await httpCacheClient.patch(url, {});
    await httpCacheClient.delete(url, {});
    expect(storageGetStub.calledWith(`GET ${limsURL}${url}`)).to.be.true;
    expect(storageGetStub.calledWith(`POST ${limsURL}${url}`)).to.be.true;
    expect(storageGetStub.calledWith(`PUT ${limsURL}${url}`)).to.be.true;
    expect(storageGetStub.calledWith(`PATCH ${limsURL}${url}`)).to.be.true;
    expect(storageGetStub.calledWith(`DELETE ${limsURL}${url}`)).to.be.true;
  });
  it("makes http request if useCache=false and returns response.data", async () => {
    const httpCacheClient = new HttpCacheClient(httpClient, false, storage);
    const result = await httpCacheClient.get(url);
    expect(result).to.equal(data);
  });
  it("returns cache if exists and useCache=true", async () => {
    const data2 = {};
    const storageGetStub2 = stub()
      .withArgs(`GET ${limsURL}${url}`)
      .returns(data2);
    sandbox.replace(storage, "get", storageGetStub2);
    const httpCacheClient = new HttpCacheClient(httpClient, true, storage);
    const result = await httpCacheClient.get(url);
    expect(result).to.equal(data2);
  });
  it("makes http request if cache does not exist and useCache=true", async () => {
    const httpCacheClient = new HttpCacheClient(httpClient, true, storage);
    const result = await httpCacheClient.get(url);
    expect(result).to.equal(data);
  });
});
