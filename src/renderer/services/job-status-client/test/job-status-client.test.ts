import { expect } from "chai";
import { createStubInstance, createSandbox, stub, useFakeTimers } from "sinon";

import JobStatusClient from "../";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";
import { JobQuery } from "../types";

import {
  badGatewayResponse,
  mockJobResponse,
  mockCreateJobRequest,
  badRequestResponse,
  internalServerError,
  mockUpdateJobRequest,
  makeAxiosResponse,
} from "./mocks";

const storage = createStubInstance(EnvironmentAwareStorage);
// Stub `get` specifically, since it is a class property and not on the prototype
storage.get = stub();

const httpClient = (createStubInstance(
  HttpCacheClient
) as any) as HttpCacheClient;

describe("JobStatusClient", () => {
  const sandbox = createSandbox();
  const jobStatusClient = new JobStatusClient(
    httpClient,
    (storage as any) as LocalStorage
  );
  afterEach(() => {
    sandbox.restore();
  });

  describe("createJob", () => {
    it("Returns job created by JSS", async () => {
      sandbox.replace(
        httpClient,
        "post",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.createJob(mockCreateJobRequest);
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("updateJob", () => {
    it("Returns updated job from JSS", async () => {
      sandbox.replace(
        httpClient,
        "patch",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.updateJob(
        "some_job",
        mockUpdateJobRequest
      );
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badGatewayResponse));

      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("getJob", () => {
    it("Returns job from JSS", async () => {
      sandbox.replace(
        httpClient,
        "get",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.getJob("some_job");
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badRequestResponse));

      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(internalServerError));

      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        internalServerError
      );
    });
  });

  describe("existsById", () => {
    it("Returns true when job successfully retrieved from JSS", async () => {
      sandbox.replace(
        httpClient,
        "get",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const jobExists = await jobStatusClient.existsById("some_job");
      expect(jobExists).to.be.true;
    });

    it("Returns false if JSS returns an error", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      const jobExists = await jobStatusClient.existsById("some_job");
      expect(jobExists).to.be.false;
    });
  });

  describe("waitForJobToExist", () => {
    it("rejects if job never exists", async () => {
      const clock = useFakeTimers();
      const jobId = "abc123";

      // (sanity-check) test no-error case
      sandbox.replace(
        httpClient,
        "get",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );
      let promise = jobStatusClient.waitForJobToExist(jobId);
      await clock.tickAsync(60_000);
      await promise;
      sandbox.restore();

      // Arrange
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      // Act / Assert
      promise = jobStatusClient.waitForJobToExist(jobId);
      await clock.tickAsync(60_000);
      await expect(promise).to.be.rejectedWith(badGatewayResponse);
      clock.restore();
    });
  });

  describe("getJobs", () => {
    const mockQuery: JobQuery = {
      user: "foo",
    };
    it("Returns job from JSS", async () => {
      sandbox.replace(
        httpClient,
        "post",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.getJobs(mockQuery);
      expect(result).to.deep.equal(mockJobResponse.data);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badGatewayResponse));

      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(internalServerError));
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        internalServerError
      );
    });
  });
});
