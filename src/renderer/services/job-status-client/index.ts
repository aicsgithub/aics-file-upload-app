import "@babel/polyfill/noConflict";
import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
} from "../../../shared/constants";

import { IllegalArgumentError } from "./errors/IllegalArgumentError";
import { JSSConnection, JSSHttpClient } from "./jss-connection";
import JSSRequestMapper from "./jss-request-mapper";
import JSSResponseMapper from "./jss-response-mapper";
import {
  CreateJobRequest,
  JobStatusClientConfig,
  JobQuery,
  JSSJob,
  UpdateJobRequest,
} from "./types";

const logLevelMap: { [logLevel: string]: ILogLevel } = Object.freeze({
  debug: Logger.DEBUG,
  error: Logger.ERROR,
  info: Logger.INFO,
  trace: Logger.TRACE,
  warn: Logger.WARN,
});

const JOB_STATUS_CLIENT_LOGGER = "job-status-client";

/***
 * Main class used by clients of this library to interact with JSS. Provides job create/read/update functionality.
 */
export default class JobStatusClient {
  private _host: string = LIMS_HOST;
  private _port: string = LIMS_PORT;
  private _username: string = DEFAULT_USERNAME;
  private readonly logger: ILogger;
  private readonly jss: JSSHttpClient;

  public get port(): string {
    return this._port;
  }

  public set port(port: string) {
    this._port = port;
    this.jss.port = port;
  }

  public get host(): string {
    return this._host;
  }

  public set host(host: string) {
    this._host = host;
    this.jss.host = host;
  }

  public get username(): string {
    return this._username;
  }

  public set username(username: string) {
    this._username = username;
    this.jss.username = username;
  }

  /***
   * Create a JobStatusClient instance.
   * @param config Provides configurations necessary for the client
   */
  public constructor(config: JobStatusClientConfig) {
    const { logLevel = "error" } = config;
    let { jss, host, port = "80", username } = config;

    if (!jss) {
      if (!host) {
        throw new IllegalArgumentError("Host must be defined");
      }

      if (!username) {
        throw new IllegalArgumentError("Username must be defined");
      }
      jss = new JSSConnection(host, port, username);
    } else {
      host = jss.host;
      port = jss.port;
      username = jss.username;
    }

    this.jss = jss;
    this._host = host;
    this._port = port;
    this._username = username;
    /* eslint-disable react-hooks/rules-of-hooks */
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
    this.logger = Logger.get(JOB_STATUS_CLIENT_LOGGER);
  }

  public async createJob(job: CreateJobRequest): Promise<JSSJob> {
    this.logger.debug("Received create job request", job);
    const response = await this.jss.post<JSSJob>("/1.0/job/", job);
    return response.data[0];
  }

  /***
   * Update Job in stored in JSS
   * @param jobId job to update
   * @param job partial job object with values to set
   * @param isPatch indicates the update to perform. If true, this method will only replace properties
   * that are listed. Otherwise, the entire property will be replaced.
   */
  public async updateJob(
    jobId: string,
    job: UpdateJobRequest,
    isPatch = true
  ): Promise<JSSJob> {
    this.logger.debug(`Received update job request for jobId=${jobId}`, job);
    const response = await this.jss.patch<JSSJob>(
      `/1.0/job/${jobId}`,
      JSSRequestMapper.map(job, isPatch)
    );
    return response.data[0];
  }

  /***
   * Get job by id
   * @param jobId corresponding id for job
   */
  public async getJob(jobId: string): Promise<JSSJob> {
    this.logger.debug(`Received get job request for jobId=${jobId}`);
    const response = await this.jss.get<JSSJob>(`/1.0/job/${jobId}`);
    return JSSResponseMapper.map(response.data[0]);
  }

  /***
   * Get jobs matching mongoDB query
   * @param query query to be passed to mongoDB for finding matching jobs
   */
  public async getJobs(query: JobQuery): Promise<JSSJob[]> {
    this.logger.debug(`Received get jobs request with query`, query);
    const response = await this.jss.post<JSSJob>(
      `/1.0/job/query`,
      JSSRequestMapper.map(query, true)
    );
    return response.data.map((job) => JSSResponseMapper.map(job));
  }
}
