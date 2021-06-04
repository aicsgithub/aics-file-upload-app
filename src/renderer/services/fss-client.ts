import * as fs from "fs";
import * as path from "path";

import axios, { AxiosRequestConfig } from "axios";
import * as humps from "humps";
import { castArray } from "lodash";
import * as hash from "object-hash";

import { UploadRequest } from "../state/types";

import { LocalStorage } from "./../types";
import {
  StartUploadResponse,
  UploadMetadataRequest,
  UploadMetadataResponse,
  UploadServiceFields,
} from "./aicsfiles/types";
import { FSSRequestFile } from "./aicsfiles/types";
import HttpCacheClient from "./http-cache-client";
import { JSSJob } from "./job-status-client/types";
import { AicsSuccessResponse, HttpClient } from "./types";

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
    filePath: string,
    metadata: UploadRequest,
    serviceFields: Partial<UploadServiceFields>
  ): Promise<StartUploadResponse> {
    const fileName = path.basename(filePath);
    const fileStats = await fs.promises.stat(filePath);
    const requestBody: Partial<JSSJob<Partial<UploadServiceFields>>> = {
      jobName: fileName,
      serviceFields: {
        ...serviceFields,
        md5: {},
        files: [metadata],
        type: UPLOAD_TYPE,
        lastModified: { [hash.MD5(filePath)]: fileStats.mtime.toJSON() },
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
    files: FSSRequestFile[]
  ): Promise<UploadMetadataResponse> {
    const request: UploadMetadataRequest = {
      files,
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
