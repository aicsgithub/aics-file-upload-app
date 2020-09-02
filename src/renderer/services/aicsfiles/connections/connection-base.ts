import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";

import { AICSFILES_LOGGER, DEFAULT_TIMEOUT } from "../constants";
import { IllegalArgumentError } from "../errors";

axios.defaults.adapter = require("axios/lib/adapters/xhr");

interface HeaderMap {
  [key: string]: string;
}

export interface AicsResponse {
  responseType: "SUCCESS" | "SERVER_ERROR" | "CLIENT_ERROR";
}

interface AicsSuccessResponse<T> extends AicsResponse {
  data: T[];
  totalCount: number;
  hasMore?: boolean;
  offset: number;
  rows?: T[];
}

export abstract class ConnectionBase {
  protected abstract get extraAxiosConfig(): AxiosRequestConfig;
  public host: string;
  public port: string;
  public user: string;
  protected readonly logger: ILogger;
  private readonly servicePath: string;

  private static ensureUser(user: string): string {
    if (!user) {
      throw new IllegalArgumentError("User is required!");
    }

    return user;
  }

  /**
   * Construct Connection instance
   * @param host Host that LIMS is running on (does not include protocol)
   * @param port Port that LIMS is running on
   * @param user User to run requests as
   * @param servicePath resource path to service
   */
  protected constructor(
    host: string,
    port = "80",
    user: string,
    servicePath: string
  ) {
    this.host = host;
    this.port = port;
    this.user = ConnectionBase.ensureUser(user);
    this.logger = Logger.get(AICSFILES_LOGGER);
    this.servicePath = servicePath;
  }

  /**
   * Send GET request
   * @param path Relative path of endpoint (should not start with leading slash)
   * @param headers Extra headers to pass in. X-User-Id header is automatically provided given user from constructor
   * @param timeout Milliseconds before timing out the request
   */
  protected get<T>(
    path: string,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<AicsSuccessResponse<T>> {
    this.logger.info(`GET ${this.baseUrl}${path}`);
    return this.axiosClient
      .get(path, this.getAxiosConfig(headers, timeout))
      .then((resp: AxiosResponse) => resp.data);
  }

  /**
   * Send POST request
   * @param path Relative path of endpoint (should not start with leading slash)
   * @param body Request body
   * @param headers Extra headers to pass in. X-User-Id header is automatically provided given user from constructor
   * @param timeout Milliseconds before timing out the request
   */
  protected post<T>(
    path: string,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    body?: any,
    headers: HeaderMap = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<AicsSuccessResponse<T>> {
    this.logger.info(`POST ${this.baseUrl}${path}`, body);
    return this.axiosClient
      .post(path, body, this.getAxiosConfig(headers, timeout))
      .then((resp: AxiosResponse) => resp.data);
  }

  protected getAxiosConfig(
    headers: HeaderMap = {},
    timeout: number
  ): AxiosRequestConfig {
    return {
      headers: this.getHeaders(headers),
      timeout,
    };
  }

  private getHeaders(extraHeaders: HeaderMap): HeaderMap {
    return {
      "Content-Type": "application/json",
      "X-User-Id": this.user,
      ...extraHeaders,
    };
  }

  private get axiosClient(): AxiosInstance {
    return axios.create({
      baseURL: this.baseUrl,
      ...this.extraAxiosConfig,
    });
  }

  private get baseUrl(): string {
    return `http://${this.host}:${this.port}/${this.servicePath}/`;
  }
}
