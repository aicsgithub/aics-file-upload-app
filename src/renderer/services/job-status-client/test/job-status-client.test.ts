import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import JobStatusClient from "../";
import { HttpClient } from "../../types";
import { JobQuery } from "../types";

import {
  badGatewayResponse,
  mockJobResponse,
  mockCreateJobRequest,
  badRequestResponse,
  internalServerError,
  mockUpdateJobRequest,
} from "./mocks";

describe("JobStatusClient", () => {
  const sandbox = createSandbox();
  const jobStatusClient = new JobStatusClient();
  const httpClient: HttpClient = {
    get: stub(),
    post: stub(),
    put: stub(),
    patch: stub(),
    delete: stub(),
  };
  const username = "foo";
  afterEach(() => {
    sandbox.restore();
  });

  describe("createJob", () => {
    it("Returns job created by JSS", async () => {
      sandbox.replace(httpClient, "post", stub().resolves(mockJobResponse));

      const result = await jobStatusClient.createJob(
        httpClient,
        username,
        mockCreateJobRequest
      );
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.createJob(httpClient, username, mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.createJob(httpClient, username, mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.createJob(httpClient, username, mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("updateJob", () => {
    it("Returns updated job from JSS", async () => {
      sandbox.replace(httpClient, "patch", stub().resolves(mockJobResponse));

      const result = await jobStatusClient.updateJob(
        httpClient,
        username,
        "some_job",
        mockUpdateJobRequest
      );
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badGatewayResponse));

      return expect(
        jobStatusClient.updateJob(
          httpClient,
          username,
          "some_job",
          mockCreateJobRequest
        )
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.updateJob(
          httpClient,
          username,
          "some_job",
          mockCreateJobRequest
        )
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.updateJob(
          httpClient,
          username,
          "some_job",
          mockCreateJobRequest
        )
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("getJob", () => {
    it("Returns job from JSS", async () => {
      sandbox.replace(httpClient, "get", stub().resolves(mockJobResponse));

      const result = await jobStatusClient.getJob(
        httpClient,
        username,
        "some_job"
      );
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      return expect(
        jobStatusClient.getJob(httpClient, username, "some_job")
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.getJob(httpClient, username, "some_job")
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.getJob(httpClient, username, "some_job")
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("getJobs", () => {
    const mockQuery: JobQuery = {
      user: "foo",
    };
    it("Returns job from JSS", async () => {
      sandbox.replace(httpClient, "post", stub().resolves(mockJobResponse));

      const result = await jobStatusClient.getJobs(
        httpClient,
        username,
        mockQuery
      );
      expect(result).to.deep.equal(mockJobResponse.data);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badGatewayResponse));

      return expect(
        jobStatusClient.getJobs(httpClient, username, mockQuery)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));
      return expect(
        jobStatusClient.getJobs(httpClient, username, mockQuery)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(internalServerError));
      return expect(
        jobStatusClient.getJobs(httpClient, username, mockQuery)
      ).to.be.rejectedWith(internalServerError);
    });
  });
});
