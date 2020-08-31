import { UploadMetadata as AicsFilesUploadMetadata } from "@aics/aicsfiles/type-declarations/types";
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
   * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
   */
  public async createBarcode(
    httpClient: HttpClient,
    prefixId: number
  ): Promise<string> {
    const url = `${mmsURL}/1.0/plate/barcode`;
    const body = { prefixId, quantity: 1 };
    const response = await httpClient.post(url, body);
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
    request: SaveTemplateRequest
  ): Promise<number> {
    const url = `${mmsURL}/1.0/template/`;
    const response = await httpClient.post(url, request);
    return response.data[0];
  }

  public async editTemplate(
    httpClient: HttpClient,
    request: SaveTemplateRequest,
    templateId: number
  ): Promise<number> {
    const url = `${mmsURL}/1.0/template/${templateId}`;
    const response = await httpClient.put(url, request);
    return response.data[0];
  }

  public async editFileMetadata(
    httpClient: HttpClient,
    fileId: string,
    request: AicsFilesUploadMetadata
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await httpClient.put(url, decamelizeKeys(request));
  }

  public async deleteFileMetadata(
    httpClient: HttpClient,
    fileId: string,
    deleteFile: boolean
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await httpClient.delete(url, { deleteFile });
  }
}
