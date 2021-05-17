import * as fs from "fs";
import * as path from "path";

import axios, { AxiosRequestConfig } from "axios";
import * as humps from "humps";
import { castArray } from "lodash";

import { UploadMetadata } from "../file-management-system/util";
import HttpCacheClient from "../http-cache-client";
import { AicsSuccessResponse } from "../types";

const UPLOAD_TYPE = "upload";
const fssURL = "/fss";

// Request types
interface FSSRequestFile {
  fileName: string;
  md5hex: string;
  fileType: string;
  metadata: UploadMetadata;
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
}

interface UploadMetadataRequest {
  jobId: string;
  files: FSSRequestFile[];
}

// Response types
export interface FSSResponseFile {
  fileName: string;
  fileId: string;
  readPath: string;
}

export interface StartUploadResponse {
  jobId: string;
  uploadDirectory: string;
}

export interface UploadMetadataResponse {
  jobId: string;
  files: FSSResponseFile[];
}

/**
 * Provides interface with FSS endpoints.
 */
export class FileStorageClient extends HttpCacheClient {
  public async startUpload(
    filePath: string,
    metadata: UploadMetadata
  ): Promise<StartUploadResponse> {
    const fileName = path.basename(filePath);
    const requestBody = {
      jobName: fileName,
      serviceFields: {
        files: [metadata],
        type: UPLOAD_TYPE,
      },
    };
    const response = await this.post<AicsSuccessResponse<StartUploadResponse>>(
      `${fssURL}/1.0/file/upload`,
      requestBody,
      FileStorageClient.getHttpRequestConfig()
    );

    return response.data[0];
  }

  public async completeClientSideOfUpload(
    jobId: string,
    file: FSSRequestFile
  ): Promise<UploadMetadataResponse> {
    const request: UploadMetadataRequest = {
      files: [file],
      jobId,
    };
    const response = await this.post<
      AicsSuccessResponse<UploadMetadataResponse>
    >(
      `${fssURL}/1.0/file/uploadComplete`,
      request,
      FileStorageClient.getHttpRequestConfig()
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
