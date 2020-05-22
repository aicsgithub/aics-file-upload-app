import { UploadMetadata as AicsFilesUploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { AxiosRequestConfig } from "axios";
import { GetPlateResponse, WellResponse } from "../../state/selection/types";
import { Template } from "../../state/template/types";
import { LocalStorage } from "../../state/types";

import BaseServiceClient from "../base-service-client";
import { SaveTemplateRequest } from "./types";

export default class MMSClient extends BaseServiceClient {
  public username: string;

  constructor(config: {
    host: string;
    localStorage: LocalStorage;
    port: string;
    protocol: string;
    username: string;
  }) {
    super(config);
    this.username = config.username;
  }

  /**
   * Creates a barcode with a given prefix
   * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
   */
  public async createBarcode(prefixId: number): Promise<string> {
    const url = "/1.0/plate/barcode";
    const body = { prefixId, quantity: 1 };
    const response = await this.httpClient.post(url, body, this.config);
    return response.data[0];
  }

  /**
   * Gets plates by barcode and imagingSessionId if provided
   * @param barcode full barcode of plate
   * @param imagingSessionId id of imaging session
   */
  public async getPlate(
    barcode: string,
    imagingSessionId?: number
  ): Promise<GetPlateResponse> {
    let url = `/1.0/plate/query?barcode=${barcode}`;
    if (imagingSessionId) {
      url += `&imagingSessionId=${imagingSessionId}`;
    }
    const response = await this.httpClient.get(url);
    const { plate, wells } = response.data[0];
    return {
      plate,
      wells: wells.map((w: Partial<WellResponse>) => ({
        ...w,
        plateId: plate.plateId,
      })),
    };
  }

  public async getTemplate(templateId: number): Promise<Template> {
    const url = `/1.0/template/${templateId}`;
    const response = await this.httpClient.get(url);
    return response.data[0];
  }

  public async createTemplate(request: SaveTemplateRequest): Promise<number> {
    const url = `/1.0/template/`;
    const response = await this.httpClient.post(url, request, this.config);
    return response.data[0];
  }

  public async editTemplate(
    request: SaveTemplateRequest,
    templateId: number
  ): Promise<number> {
    const url = `/1.0/template/${templateId}`;
    const response = await this.httpClient.put(url, request, this.config);
    return response.data[0];
  }

  // TODO: change the request type and implementation once the PUT endpoint is created
  public async editFileMetadata(
    fileId: string,
    request: AicsFilesUploadMetadata
  ): Promise<void> {
    await this.deleteFileMetadata(fileId, false);
    await this.createFileMetadata(fileId, request);
  }

  public async deleteFileMetadata(
    fileId: string,
    deleteFile: boolean
  ): Promise<void> {
    const url = `/1.0/filemetadata/${fileId}`;
    await this.httpClient.delete(url, { deleteFile }, this.config);
  }

  public async createFileMetadata(
    fileId: string,
    request: AicsFilesUploadMetadata
  ): Promise<void> {
    const url = `/1.0/filemetadata/${fileId}`;
    const response = await this.httpClient.post(url, request, this.config);
    return response.data[0];
  }

  protected get baseURL(): string {
    return `${this.protocol}://${this.host}:${this.port}/metadata-management-service`;
  }

  private get config(): AxiosRequestConfig {
    return {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": this.username,
      },
    };
  }
}
