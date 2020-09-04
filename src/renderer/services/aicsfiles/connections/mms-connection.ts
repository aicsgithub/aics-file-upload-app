import { AxiosRequestConfig } from "axios";

import { FileMetadata } from "../types";

import { ConnectionBase } from "./connection-base";

/**
 * Provides interface with MMS endpoints.
 */
export class MMSConnection extends ConnectionBase {
  private static readonly servicePath = "metadata-management-service";

  /**
   * Construct MMSConnection instance
   * @param host Host that MMS is running on (does not include protocol)
   * @param port Port that MMS is running on
   * @param user User to run requests as
   */
  public constructor(host: string, port: string, user: string) {
    super(host, port, user, MMSConnection.servicePath);
  }

  public getFileMetadata(fileId: string): Promise<FileMetadata> {
    return this.get<FileMetadata>(`1.0/filemetadata/${fileId}`).then(
      ({ data }) => data[0]
    );
  }

  protected get extraAxiosConfig(): AxiosRequestConfig {
    return {};
  }
}
