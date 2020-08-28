import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import JobStatusClient from "../";
import { JSSConnection } from "../jss-connection";
import { JobQuery, JobStatusClientConfig } from "../types";

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
  const jss = new JSSConnection("localhost", "8080", "foo");

  afterEach(() => {
    sandbox.restore();
  });

  describe("constructor", () => {
    const HOST = "localhost";
    const PORT = "8080";
    const USER = "foo";
    const testConstructor = (config: JobStatusClientConfig): void => {
      const jobStatusClient = new JobStatusClient(config);
      expect(jobStatusClient.host).to.equal(HOST);
      expect(jobStatusClient.port).to.equal(PORT);
    };

    it("uses host and port if provided", () => {
      testConstructor({ host: HOST, port: PORT, username: USER });
    });

    it("ignores host and port if jss connection provided", () => {
      testConstructor({
        host: "wronghost",
        port: "9090",
        jss: new JSSConnection(HOST, PORT, USER),
      });
    });

    it("allows just JSSConnection to be passed in config", () => {
      testConstructor({ jss: new JSSConnection(HOST, PORT, USER) });
    });
  });

  describe("createJob", () => {
    it("Returns job created by JSS", async () => {
      sandbox.replace(jss, "post", stub().resolves(mockJobResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      const result = await jobStatusClient.createJob(mockCreateJobRequest);
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(jss, "post", stub().rejects(badRequestResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(jss, "post", stub().rejects(badRequestResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(jss, "post", stub().rejects(internalServerError));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("updateJob", () => {
    it("Returns updated job from JSS", async () => {
      sandbox.replace(jss, "patch", stub().resolves(mockJobResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      const result = await jobStatusClient.updateJob(
        "some_job",
        mockUpdateJobRequest
      );
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(jss, "patch", stub().rejects(badGatewayResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(jss, "patch", stub().rejects(badRequestResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(jss, "patch", stub().rejects(internalServerError));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("getJob", () => {
    it("Returns job from JSS", async () => {
      sandbox.replace(jss, "get", stub().resolves(mockJobResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      const result = await jobStatusClient.getJob("some_job");
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(jss, "get", stub().rejects(badGatewayResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(jss, "get", stub().rejects(badRequestResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(jss, "get", stub().rejects(internalServerError));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        internalServerError
      );
    });
  });

  describe("getJobs", () => {
    const mockQuery: JobQuery = {
      user: "foo",
    };
    it("Returns job from JSS", async () => {
      sandbox.replace(jss, "post", stub().resolves(mockJobResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      const result = await jobStatusClient.getJobs(mockQuery);
      expect(result).to.deep.equal(mockJobResponse.data);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(jss, "post", stub().rejects(badGatewayResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(jss, "post", stub().rejects(badRequestResponse));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(jss, "post", stub().rejects(internalServerError));
      const jobStatusClient = new JobStatusClient({ jss });
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        internalServerError
      );
    });
  });
});
