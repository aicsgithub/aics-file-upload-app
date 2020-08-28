import "@babel/polyfill/noConflict";
import { AxiosRequestConfig } from "axios";
import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";

import { AicsSuccessResponse, HeaderMap, HttpClient } from "../types";

import JSSRequestMapper from "./jss-request-mapper";
import JSSResponseMapper from "./jss-response-mapper";
import { CreateJobRequest, JobQuery, JSSJob, UpdateJobRequest } from "./types";

const logLevelMap: { [logLevel: string]: ILogLevel } = Object.freeze({
  debug: Logger.DEBUG,
  error: Logger.ERROR,
  info: Logger.INFO,
  trace: Logger.TRACE,
  warn: Logger.WARN,
});
// Timeout was chosen to match timeout used by aicsfiles-python
const DEFAULT_TIMEOUT = 5 * 60 * 1000;
const JOB_STATUS_CLIENT_LOGGER = "job-status-client";

/***
 * Main class used by clients of this library to interact with JSS. Provides job create/read/update functionality.
 */
export default class JobStatusClient {
  private readonly logger: ILogger;

  /***
   * Create a JobStatusClient instance.
   * @param logLevel minimum severity to log at
   */
  public constructor(
    logLevel: "debug" | "error" | "info" | "trace" | "warn" = "error"
  ) {
    /* eslint-disable react-hooks/rules-of-hooks */
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
    this.logger = Logger.get(JOB_STATUS_CLIENT_LOGGER);
  }

  /**
   * Creates a job and returns created job
   * @param httpClient
   * @param username of user initiating request
   * @param job
   */
  public async createJob(
    httpClient: HttpClient,
    username: string,
    job: CreateJobRequest
  ): Promise<JSSJob> {
    this.logger.debug("Received create job request", job);
    const response = await httpClient.post<AicsSuccessResponse<JSSJob>>(
      "/jss/1.0/job/",
      job
    );
    return response.data[0];
  }

  /***
   * Update Job in stored in JSS and returns updated job
   * @param httpClient
   * @param username of user initiating request
   * @param jobId job to update
   * @param job partial job object with values to set
   * @param patchUpdateServiceFields indicates whether to patch update serviceFields of the job or replace the entire
   * serviceFields object in db with serviceFields provided in request.
   */
  public async updateJob(
    httpClient: HttpClient,
    username: string,
    jobId: string,
    job: UpdateJobRequest,
    patchUpdateServiceFields = true
  ): Promise<JSSJob> {
    this.logger.debug(`Received update job request for jobId=${jobId}`, job);
    const response = await httpClient.patch<AicsSuccessResponse<JSSJob>>(
      `/jss/1.0/job/${jobId}`,
      JSSRequestMapper.map(job, patchUpdateServiceFields)
    );
    return response.data[0];
  }

  /***
   * Get job by id
   * @param httpClient
   * @param username
   * @param jobId corresponding id for job
   */
  public async getJob(
    httpClient: HttpClient,
    username: string,
    jobId: string
  ): Promise<JSSJob> {
    this.logger.debug(`Received get job request for jobId=${jobId}`);
    const response = await httpClient.get<AicsSuccessResponse<JSSJob>>(
      `/jss/1.0/job/${jobId}`
    );
    return JSSResponseMapper.map(response.data[0]);
  }

  /***
   * Get jobs matching mongoDB query
   * @param httpClient
   * @param username of user initiating request
   * @param query query to be passed to mongoDB for finding matching jobs
   */
  public async getJobs(
    httpClient: HttpClient,
    username: string,
    query: JobQuery
  ): Promise<JSSJob[]> {
    this.logger.debug(`Received get jobs request with query`, query);
    const response = await httpClient.post<AicsSuccessResponse<JSSJob>>(
      `/jss/1.0/job/query`,
      JSSRequestMapper.map(query, true),
      JobStatusClient.getHttpRequestConfig(username)
    );
    return response.data.map((job) => JSSResponseMapper.map(job));
  }

  private static getHttpRequestConfig(
    username: string,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): AxiosRequestConfig {
    return {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": username,
        ...headers,
      },
      timeout,
    };
  }
}
