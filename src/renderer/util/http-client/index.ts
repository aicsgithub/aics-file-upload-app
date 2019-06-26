import { AxiosError, AxiosResponse } from "axios";
import { HttpClient } from "../../state/types";

export class RetryableHttpClient {
    private httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    // public get<T>(url: string, retry = false): Promise<AxiosResponse<T> | AxiosResponse<any> | undefined> {
    //     const execute = () => this.httpClient.get<T>(url)
    //                             .catch((e: AxiosError) => e.response);
    //     if (!retry) {
    //         return execute();
    //     }
    //
    //     return this.executeAndRetry(execute, );
    // }
    //
    // private executeAndRetry<T>(): Promise<AxiosResponse<T> | AxiosResponse<any> | undefined> {
    //
    // }
}
