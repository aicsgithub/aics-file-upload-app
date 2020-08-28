import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as humps from "humps";
import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { castArray } from "lodash";

import { IllegalArgumentError } from "./errors/IllegalArgumentError";
import { AicsSuccessResponse, HeaderMap } from "./types";

import { JOB_STATUS_CLIENT_LOGGER } from "./";

// Timeout was chosen to match timeout used by aicsfiles-python
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

export class JSSConnection {
  public host: string;
  public port: string;
  public username: string;
  private readonly logger: ILogger;

  private get axiosClient(): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      transformResponse: [
        ...castArray(axios.defaults.transformResponse),
        (data) => humps.camelizeKeys(data),
      ],
      transformRequest: [
        (data) => humps.decamelizeKeys(data),
        ...castArray(axios.defaults.transformRequest),
      ],
    });
  }

  /**
   * Construct JSSConnection instance
   * @param host Host that JSS is running on (does not include protocol)
   * @param port Port that JSS is running on
   * @param user User to run requests as
   */
  public constructor(host: string, port = "80", user: string) {
    this.host = host;
    this.port = port;
    this.username = this.ensureUser(user);
    this.logger = Logger.get(JOB_STATUS_CLIENT_LOGGER);
  }

  /**
   * Send POST request to JSS
   * @param path Relative path of endpoint (should start with leading slash)
   * @param body Request body
   * @param headers Extra headers to pass in. X-User-Id header is automatically provided given username from constructor
   * @param timeout Milliseconds before timing out the request
   */
  public async post<T>(
    path: string,
    body: any,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<AicsSuccessResponse<T>> {
    this.logger.debug(`POST ${this.baseUrl}${path}`, body);
    return this.axiosClient
      .post(path, body, this.getAxiosConfig(headers, timeout))
      .then((resp: AxiosResponse) => resp.data);
  }

  /**
   * Send PUT request to JSS
   * @param path Relative path of endpoint (should start with leading slash)
   * @param body Request body
   * @param headers Extra headers to pass in. X-User-Id header is automatically provided given username from constructor
   * @param timeout Milliseconds before timing out the request
   */
  public put<T>(
    path: string,
    body: any,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<AicsSuccessResponse<T>> {
    this.logger.debug(`PUT ${this.baseUrl}${path}`, body);
    return this.axiosClient
      .put(path, body, this.getAxiosConfig(headers, timeout))
      .then((resp: AxiosResponse) => resp.data);
  }

  /**
   * Send PATCH request to JSS
   * @param path Relative path of endpoint (should start with leading slash)
   * @param body Request body
   * @param headers Extra headers to pass in. X-User-Id header is automatically provided given username from constructor
   * @param timeout Milliseconds before timing out the request
   */
  public patch<T>(
    path: string,
    body: any,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<AicsSuccessResponse<T>> {
    this.logger.debug(`PATCH ${this.baseUrl}${path}`, body);
    return this.axiosClient
      .patch(path, body, this.getAxiosConfig(headers, timeout))
      .then((resp: AxiosResponse) => resp.data);
  }

  /**
   * Send GET request to JSS
   * @param path Relative path of endpoint (should start with leading slash)
   * @param headers Extra headers to pass in. X-User-Id header is automatically provided given username from constructor
   * @param timeout Milliseconds before timing out the request
   */
  public get<T>(
    path: string,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<AicsSuccessResponse<T>> {
    this.logger.debug(`GET ${this.baseUrl}${path}`);
    return this.axiosClient
      .get(path, this.getAxiosConfig(headers, timeout))
      .then((resp: AxiosResponse) => resp.data);
  }

  private ensureUser(user: string): string {
    if (!user) {
      throw new IllegalArgumentError("User is required!");
    }

    return user;
  }

  private getAxiosConfig(
    headers: HeaderMap = {},
    timeout: number
  ): AxiosRequestConfig {
    return {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": this.username,
        ...headers,
      },
      timeout,
    };
  }

  private get baseUrl(): string {
    return `http://${this.host}:${this.port}/jss/`;
  }
}
