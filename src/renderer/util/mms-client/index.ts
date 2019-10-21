import { GetPlateResponse } from "../../state/selection/types";
import BaseServiceClient from "../base-service-client";

export default class MMSClient extends BaseServiceClient {
    private readonly username: string;

    constructor(config: {host: string, port: string, protocol: string, username: string}) {
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
        const response = await this.httpClient.post(url, body, { headers: { "X-User-Id": this.username } });
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

    protected get baseURL(): string {
        return `${this.protocol}://${this.host}:${this.port}/metadata-management-service`;
    }
}
