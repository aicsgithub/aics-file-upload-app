import axios, { AxiosRequestConfig } from "axios";
import * as humps from "humps";
import { values, castArray } from "lodash";

import {
  SourceFiles,
  StartUploadResponse,
  UploadMetadataRequest,
  UploadMetadataResponse,
  Uploads,
} from "../types";

import { ConnectionBase } from "./connection-base";

const UPLOAD_TYPE = "upload";

/**
 * Provides interface with FSS endpoints.
 */
export class FSSConnection extends ConnectionBase {
  private static readonly servicePath = "fss";

  /**
   * Construct FSSConnection instance
   * @param host Host that FSS is running on (does not include protocol)
   * @param port Port that FSS is running on
   * @param user User to run requests as
   */
  public constructor(host: string, port = "80", user: string) {
    super(host, port, user, FSSConnection.servicePath);
  }

  public async startUpload(
    uploads: Uploads,
    uploadJobName: string
  ): Promise<StartUploadResponse> {
    const requestBody = {
      jobName: uploadJobName,
      serviceFields: {
        files: values(uploads),
        type: UPLOAD_TYPE,
      },
    };
    const response = await this.post<StartUploadResponse>(
      "1.0/file/upload",
      requestBody
    );

    return response.data[0];
  }

  public uploadComplete(
    jobId: string,
    sourceFiles: SourceFiles
  ): Promise<UploadMetadataResponse> {
    const request: UploadMetadataRequest = {
      files: values(sourceFiles),
      jobId,
    };
    return this.post<UploadMetadataResponse>(
      "1.0/file/uploadComplete",
      request
    ).then(({ data }) => data[0]);
  }

  protected get extraAxiosConfig(): AxiosRequestConfig {
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
