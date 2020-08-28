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
