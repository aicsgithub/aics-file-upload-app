import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";
import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";
import { castArray } from "lodash";

import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { AicsSuccessResponse, HttpClient } from "../types";

import JSSRequestMapper from "./jss-request-mapper";
import JSSResponseMapper from "./jss-response-mapper";
import { CreateJobRequest, JobQuery, JSSJob, UpdateJobRequest } from "./types";

import { Connection } from "amqplib";

const amqp = require("amqplib");

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
export default class JobStatusClient extends HttpCacheClient {
  private static readonly JSS_QUEUE_NAME = "jss-incoming-queue";
  private readonly logger: ILogger;
  private readonly jssConnectionUrl: string;

  /***
   * Create a JobStatusClient instance.
   * @param httpClient
   * @param storage
   * @param useCache
   * @param logLevel minimum severity to log at
   */
  public constructor(
    httpClient: HttpClient,
    storage: LocalStorage,
    userName: string,
    password: string,
    host: string,
    port: number,
    useCache = false,
    logLevel: "debug" | "error" | "info" | "trace" | "warn" = "error"
  ) {
    super(httpClient, storage, useCache);
    /* eslint-disable react-hooks/rules-of-hooks */
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
    this.logger = Logger.get(JOB_STATUS_CLIENT_LOGGER);
    this.jssConnectionUrl = `amqps://${userName}:${password}@${host}:${port}/`;
  }

  /**
   * Creates a job and returns created job
   * @param job
   */
  public async createJob<T = any>(job: CreateJobRequest<T>): Promise<void> {
    this.logger.debug("Received create job request", job);
    return this.sendMessage(JSON.stringify(job));
  }

  /***
   * Update Job in stored in JSS and returns updated job
   * @param jobId job to update
   * @param job partial job object with values to set
   * @param patchUpdateServiceFields indicates whether to patch update serviceFields of the job or replace the entire
   * serviceFields object in db with serviceFields provided in request.
   */
  public async updateJob(
    jobId: string,
    job: UpdateJobRequest,
    patchUpdateServiceFields = true
  ): Promise<void> {
    this.logger.debug(`Received update job request for jobId=${jobId}`, job);
    const request = JSSRequestMapper.map(job, patchUpdateServiceFields);
    const message = JSON.stringify({ jobId, ...request });
    return this.sendMessage(message);
  }

  /***
   * Get job by id
   * @param jobId corresponding id for job
   */
  public async getJob(jobId: string): Promise<JSSJob> {
    this.logger.debug(`Received get job request for jobId=${jobId}`);
    const response = await this.get<AicsSuccessResponse<JSSJob>>(
      `/jss/1.0/job/${jobId}`,
      JobStatusClient.getHttpRequestConfig()
    );
    return JSSResponseMapper.map(response.data[0]);
  }

  /***
   * Get jobs matching mongoDB query
   * @param query query to be passed to mongoDB for finding matching jobs
   */
  public async getJobs(query: JobQuery): Promise<JSSJob[]> {
    this.logger.debug(`Received get jobs request with query`, query);
    const response = await this.post<AicsSuccessResponse<JSSJob>>(
      `/jss/1.0/job/query`,
      JSSRequestMapper.map(query, true),
      JobStatusClient.getHttpRequestConfig()
    );
    return response.data.map((job: JSSJob) => JSSResponseMapper.map(job));
  }

  // Sends given message to the JSS message queue
  private async sendMessage(message: string): Promise<void> {
    await new Promise((resolve, reject) => {
      amqp
        .connect(this.jssConnectionUrl)
        .then((connection: Connection) => {
          connection
            .createChannel()
            .then((channel) => {
              channel
                .checkQueue(JobStatusClient.JSS_QUEUE_NAME)
                .then(() => {
                  channel.sendToQueue(
                    JobStatusClient.JSS_QUEUE_NAME,
                    Buffer.from(message)
                  );
                  resolve(message);
                  console.log("Message sent", message); // TODO: remove
                })
                .catch(reject)
                .finally(() => {
                  channel.close();
                  connection.close();
                });
            })
            .catch((err) => {
              this.logger.error("Error creating channel", err);
              connection.close();
              reject(err);
            });
        })
        .catch(reject);
    });
  }

  // JSS expects properties of requests to be in snake_case format and returns responses in snake_case format as well
  private static getHttpRequestConfig(): AxiosRequestConfig {
    return {
      timeout: DEFAULT_TIMEOUT,
      transformResponse: [
        ...castArray(axios.defaults.transformResponse),
        (data) => camelizeKeys(data),
      ],
      transformRequest: [
        (data) => decamelizeKeys(data),
        ...castArray(axios.defaults.transformRequest),
      ],
    };
  }
}
