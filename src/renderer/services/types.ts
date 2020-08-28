import { AxiosRequestConfig } from "axios";

export interface HeaderMap {
  [key: string]: string;
}

export interface AicsResponse {
  responseType: "SUCCESS" | "SERVER_ERROR" | "CLIENT_ERROR";
}

export interface AicsSuccessResponse<T> extends AicsResponse {
  data: T[];
  totalCount: number;
  hasMore?: boolean;
  offset: number;
}

export interface HttpClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  put<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  patch<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  delete<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
}
