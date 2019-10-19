import { AxiosInstance, AxiosRequestConfig } from "axios";

import { LocalStorage } from "../../state/types";

export default class HttpAndCacheClient {
    private httpClient: AxiosInstance;
    private localStorage: LocalStorage;

    constructor(httpClient: AxiosInstance, localStorage: LocalStorage, useCache: boolean) {
        this.httpClient = httpClient;
        this.localStorage = localStorage;

        if (useCache) {
            this.get = this.getAndReturnCache;
            this.post = this.postAndReturnCache;
            this.put = this.putAndReturnCache;
        }
    }

    public get = async <T = any>(url: string, config?: AxiosRequestConfig) => {
        const response = await this.httpClient.get(url, config);
        return response.data;
    }

    public post = async <T = any>(url: string, request: any, config?: AxiosRequestConfig) => {
        const response = await this.httpClient.post(url, request, config);
        return response.data;
    }

    public put = async <T = any>(url: string, request: any, config?: AxiosRequestConfig) => {
        const response = await this.httpClient.put(url, request, config);
        return response.data;
    }

    private getAndReturnCache = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
        const key = `GET ${url}`;
        const cachedResponse: T = this.localStorage.get(key) as any as T;
        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await this.httpClient.get(url, config);
        if (response.status === 200 && response.data) {
            this.localStorage.set(key, response.data);
        }
        return response.data;
    }

    private postAndReturnCache = async <T = any>(url: string, request: any,
                                                 config?: AxiosRequestConfig): Promise<T> => {
        const key = `POST ${url}`;
        const cachedResponse: T = this.localStorage.get(key) as any as T;
        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await this.httpClient.post(url, request, config);
        if (response.status === 200 && response.data) {
            this.localStorage.set(key, response.data);
        }
        return response.data;
    }

    private putAndReturnCache = async <T = any>(url: string, request: any,
                                                config?: AxiosRequestConfig): Promise<T> => {
        const key = `PUT ${url}`;
        const cachedResponse: T = this.localStorage.get(key) as any as T;
        if (cachedResponse) {
            return cachedResponse;
        }

        const response = await this.httpClient.put(url, request, config);
        if (response.status === 200 && response.data) {
            this.localStorage.set(key, response.data);
        }
        return response.data;
    }
}
