import { UploadMetadata as AicsFilesUploadMetadata } from "@aics/aicsfiles/type-declarations/types";
import { AxiosRequestConfig } from "axios";
import { decamelizeKeys } from "humps";

import { HttpClient } from "../types";

import {
  GetPlateResponse,
  SaveTemplateRequest,
  Template,
  WellResponse,
} from "./types";

const mmsURL = "/metadata-management-service";

export default class MMSClient {
  /**
   * Creates a barcode with a given prefix
   * @param httpClient
   * @param username
   * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
   */
  public async createBarcode(
    httpClient: HttpClient,
    username: string,
    prefixId: number
  ): Promise<string> {
    const url = `${mmsURL}/1.0/plate/barcode`;
    const body = { prefixId, quantity: 1 };
    const response = await httpClient.post(
      url,
      body,
      MMSClient.getHttpRequestConfig(username)
    );
    return response.data[0];
  }

  /**
   * Gets plates by barcode and imagingSessionId if provided
   * @param httpClient
   * @param barcode full barcode of plate
   * @param imagingSessionId id of imaging session
   */
  public async getPlate(
    httpClient: HttpClient,
    barcode: string,
    imagingSessionId?: number
  ): Promise<GetPlateResponse> {
    let url = `${mmsURL}/1.0/plate/query?barcode=${barcode}`;
    if (imagingSessionId) {
      url += `&imagingSessionId=${imagingSessionId}`;
    }
    const response = await httpClient.get(url);
    const { plate, wells } = response.data[0];
    return {
      plate,
      wells: wells.map((w: Partial<WellResponse>) => ({
        ...w,
        plateId: plate.plateId,
      })),
    };
  }

  public async getTemplate(
    httpClient: HttpClient,
    templateId: number
  ): Promise<Template> {
    const url = `${mmsURL}/1.0/template/${templateId}`;
    const response = await httpClient.get(url);
    return response.data[0];
  }

  public async createTemplate(
    httpClient: HttpClient,
    username: string,
    request: SaveTemplateRequest
  ): Promise<number> {
    const url = `${mmsURL}/1.0/template/`;
    const response = await httpClient.post(
      url,
      request,
      MMSClient.getHttpRequestConfig(username)
    );
    return response.data[0];
  }

  public async editTemplate(
    httpClient: HttpClient,
    username: string,
    request: SaveTemplateRequest,
    templateId: number
  ): Promise<number> {
    const url = `${mmsURL}/1.0/template/${templateId}`;
    const response = await httpClient.put(
      url,
      request,
      MMSClient.getHttpRequestConfig(username)
    );
    return response.data[0];
  }

  public async editFileMetadata(
    httpClient: HttpClient,
    username: string,
    fileId: string,
    request: AicsFilesUploadMetadata
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await httpClient.put(
      url,
      decamelizeKeys(request),
      MMSClient.getHttpRequestConfig(username)
    );
  }

  public async deleteFileMetadata(
    httpClient: HttpClient,
    username: string,
    fileId: string,
    deleteFile: boolean
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await httpClient.delete(
      url,
      { deleteFile },
      MMSClient.getHttpRequestConfig(username)
    );
  }

  private static getHttpRequestConfig(username: string): AxiosRequestConfig {
    return {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": username,
      },
    };
  }
}
