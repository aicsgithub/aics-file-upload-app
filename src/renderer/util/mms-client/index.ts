import axios, { AxiosInstance } from "axios";
import { GetPlateResponse } from "../../state/selection/types";

export default class MMSClient {
    public protocol: string;
    public host: string;
    public port: string;
    private username: string;

    private get httpClient(): AxiosInstance {
        return axios.create({
            baseURL: this.baseURL,
        });
    }

    constructor({host, port, protocol, username}: {host: string, port: string, protocol: string, username: string}) {
        this.protocol = protocol;
        this.host = host;
        this.port = port;
        this.username = username;
    }

    /**
     * Creates a barcode with a given prefix
     * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
     */
    public async createBarcode(prefixId: number): Promise<string> {
        const url = "/1.0/plate/barcode";
        const body = { prefixId, quantity: 1 };
        const response = await this.httpClient.post(url, body, { headers: { "X-User-Id": this.username } });
        return response.data.data[0];
    }

    /**
     * Gets plates by barcode and imagingSessionId if provided
     * @param barcode full barcode of plate
     * @param imagingSessionId id of imaging session
     */
    public async getPlate(barcode: string, imagingSessionId?: number): Promise<GetPlateResponse> {
        const url = `/1.0/plate/query?barcode=${barcode}`;
        const response = await this.httpClient.get(url);
        return response.data.data[0];
    }

    private get baseURL(): string {
        return `${this.protocol}://${this.host}:${this.port}/labkey`;
    }
}
