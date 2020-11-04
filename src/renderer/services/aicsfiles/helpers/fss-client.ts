import axios, { AxiosRequestConfig } from "axios";
import * as humps from "humps";
import { values, castArray } from "lodash";

import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";
import { AicsSuccessResponse, HttpClient } from "../../types";
import {
  SourceFiles,
  StartUploadResponse,
  UploadMetadataRequest,
  UploadMetadataResponse,
  Uploads,
} from "../types";

const UPLOAD_TYPE = "upload";

const fssURL = "/fss";

/**
 * Provides interface with FSS endpoints.
 */
export class FSSClient extends HttpCacheClient {
  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache = false
  ) {
    super(httpClient, localStorage, useCache);
    this.startUpload = this.startUpload.bind(this);
    this.uploadComplete = this.uploadComplete.bind(this);
  }

  public async startUpload(
    uploads: Uploads,
    uploadJobName: string,
    lastModified: { [originalPath: string]: Date }
  ): Promise<StartUploadResponse> {
    const requestBody = {
      jobName: uploadJobName,
      serviceFields: {
        files: values(uploads),
        lastModified,
        md5: {},
        type: UPLOAD_TYPE,
      },
    };
    const response = await this.post<AicsSuccessResponse<StartUploadResponse>>(
      `${fssURL}/1.0/file/upload`,
      requestBody,
      FSSClient.getHttpRequestConfig()
    );

    return response.data[0];
  }

  public async uploadComplete(
    jobId: string,
    sourceFiles: SourceFiles
  ): Promise<UploadMetadataResponse> {
    const request: UploadMetadataRequest = {
      files: values(sourceFiles),
      jobId,
    };
    const response = await this.post<
      AicsSuccessResponse<UploadMetadataResponse>
    >(
      `${fssURL}/1.0/file/uploadComplete`,
      request,
      FSSClient.getHttpRequestConfig()
    );
    return response.data[0];
  }

  // FSS expects properties of requests to be in snake_case format and returns responses in snake_case format as well
  private static getHttpRequestConfig(): AxiosRequestConfig {
    return {
      transformResponse: [
        ...castArray(axios.defaults.transformResponse),
        (data: any) => humps.camelizeKeys(data),
      ],
      transformRequest: [
        (data: any) => humps.decamelizeKeys(data),
        ...castArray(axios.defaults.transformRequest),
      ],
    };
  }
}
