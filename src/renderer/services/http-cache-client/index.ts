import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import { LocalStorage } from "../../types";

export default class HttpCacheClient {
  private httpClient: AxiosInstance;
  private localStorage: LocalStorage;

  constructor(
    httpClient: AxiosInstance,
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
    const response = await this.httpClient.get(url, config);
    return response.data;
  };

  public post = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    const response = await this.httpClient.post(url, request, config);
    return response.data;
  };

  public put = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    const response = await this.httpClient.put(url, request, config);
    return response.data;
  };

  public patch = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    const response = await this.httpClient.patch(url, request, config);
    return response.data;
  };

  public delete = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) => {
    const response = await this.httpClient.delete(url, {
      ...config,
      data: request,
    });
    return response.data;
  };

  private getAndReturnCache = async <T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `GET ${url}`;
    const action = () => this.httpClient.get(url, config);
    return this.checkCache(key, action);
  };

  private postAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `POST ${url}`;
    const action = () => this.httpClient.post(url, request, config);
    return this.checkCache(key, action);
  };

  private putAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `PUT ${url}`;
    const action = () => this.httpClient.put(url, request, config);
    return this.checkCache(key, action);
  };

  private patchAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `PATCH ${url}`;
    const action = () => this.httpClient.patch(url, request, config);
    return this.checkCache(key, action);
  };

  private deleteAndReturnCache = async <T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const key = `DELETE ${url}`;
    const action = () =>
      this.httpClient.delete(url, {
        ...config,
        data: request,
      });
    return this.checkCache(key, action);
  };

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
