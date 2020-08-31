import { AxiosRequestConfig, AxiosResponse } from "axios";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  USER_SETTINGS_KEY,
} from "../../../shared/constants";
import { LocalStorage } from "../../state/types";
import { HttpClient } from "../types";

export default class HttpCacheClient {
  private httpClient: HttpClient;
  private localStorage: LocalStorage;

  constructor(
    httpClient: HttpClient,
    useCache: boolean,
    localStorage: LocalStorage
  ) {
    this.httpClient = httpClient;
    this.localStorage = localStorage;

    if (useCache) {
      this.get = this.getAndReturnCache;
      this.post = this.postAndReturnCache;
      this.put = this.putAndReturnCache;
      this.patch = this.patchAndReturnCache;
      this.delete = this.deleteAndReturnCache;
    }
  }

  public get = async <T = any>(url: string, config?: AxiosRequestConfig) => {
    url = this.getFullUrl(url);
    const response = await this.httpClient.get(url, {
      ...this.getHttpRequestConfig(),
      ...config,
    });
    return response.data;
  };

  public post = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    url = this.getFullUrl(url);
    const response = await this.httpClient.post(url, request, {
      ...this.getHttpRequestConfig(),
      ...config,
    });
    return response.data;
  };

  public put = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    url = this.getFullUrl(url);
    const response = await this.httpClient.put(url, request, {
      ...this.getHttpRequestConfig(),
      ...config,
    });
    return response.data;
  };

  public patch = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    url = this.getFullUrl(url);
    const response = await this.httpClient.patch(url, request, {
      ...this.getHttpRequestConfig(),
      ...config,
    });
    return response.data;
  };

  public delete = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    url = this.getFullUrl(url);
    const response = await this.httpClient.delete(url, {
      ...this.getHttpRequestConfig(),
      ...config,
      data: request,
    });
    return response.data;
  };

  private getAndReturnCache = async <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `GET ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.get(url, config);
    return this.checkCache(key, action);
  };

  private postAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `POST ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.post(url, request, config);
    return this.checkCache(key, action);
  };

  private putAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `PUT ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.put(url, request, config);
    return this.checkCache(key, action);
  };

  private patchAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `PATCH ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.patch(url, request, config);
    return this.checkCache(key, action);
  };

  private deleteAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `DELETE ${this.getFullUrl(url)}`;
    const action = () =>
      this.httpClient.delete(this.getFullUrl(url), {
        ...config,
        data: request,
      });
    return this.checkCache(key, action);
  };

  private getHttpRequestConfig = (): AxiosRequestConfig => {
    const userSettings = this.localStorage.get(USER_SETTINGS_KEY);
    const username = userSettings?.username || DEFAULT_USERNAME;
    return {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": username,
      },
    };
  };

  private getFullUrl = (url: string) => {
    if (url.startsWith("http")) {
      return url;
    }
    return `${this.limsUrl}${url.startsWith("/") ? url : `/${url}`}`;
  };

  private get limsUrl() {
    const userSettings = this.localStorage.get(USER_SETTINGS_KEY);
    let host = LIMS_HOST;
    let port = LIMS_PORT;
    const protocol = LIMS_PROTOCOL;
    if (userSettings) {
      host = userSettings.limsHost;
      port = userSettings.limsPort;
    }
    return `${protocol}://${host}:${port}`;
  }

  private checkCache = async <T = any>(
    key: string,
    action: () => Promise<AxiosResponse<T>>
  ): Promise<T> => {
    const cachedResponse: T = this.localStorage.get(key) as T;
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await action();
    if (response.status === 200 && response.data) {
      this.localStorage.set(key, response.data);
    }
    return response.data;
  };
}
