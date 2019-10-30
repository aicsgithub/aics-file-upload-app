import { AxiosRequestConfig } from "axios";
import { GetPlateResponse } from "../../state/selection/types";
import { SaveTemplateRequest, Template } from "../../state/template/types";
import { LocalStorage } from "../../state/types";

import BaseServiceClient from "../base-service-client";

export default class MMSClient extends BaseServiceClient {
    private readonly username: string;

    constructor(config: {host: string, localStorage: LocalStorage, port: string, protocol: string, username: string}) {
        super(config);
        this.username = "lisah";
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
    public async getPlate(barcode: string, imagingSessionId?: number): Promise<GetPlateResponse> {
        const url = `/1.0/plate/query?barcode=${barcode}`;
        const response = await this.httpClient.get(url);
        return response.data[0];
    }

    // todo description
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

    public async editTemplate(request: SaveTemplateRequest, templateId: number): Promise<number> {
        const url = `/1.0/template/${templateId}`;
        const response = await this.httpClient.put(url, request, this.config);
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
