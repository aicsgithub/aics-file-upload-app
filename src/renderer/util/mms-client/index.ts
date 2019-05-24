import { MMS_BASE_URL } from "../../constants";
import { GetPlateResponse, GetViabilityResultResponse } from "../../state/selection/types";
import { HttpClient } from "../../state/types";

class Get {
    /**
     * Gets plates by barcode and imagingSessionId if provided
     * @param httpClient
     * @param barcode full barcode of plate
     * @param imagingSessionId id of imagin
     */
    public static async plate(
        httpClient: HttpClient,
        barcode: string,
        imagingSessionId?: number
    ): Promise<GetPlateResponse> {
        const baseUrl = `${MMS_BASE_URL}/1.0/plate/query?barcode=${barcode}`;
        const url = imagingSessionId ? `${baseUrl}&imagingSessionId=${imagingSessionId}` : baseUrl;
        const response = await httpClient.get(url);
        return response.data.data[0];
    }

    public static async viabilityResults(httpClient: HttpClient, plateId: number):
        Promise<GetViabilityResultResponse[]> {
        const response = await httpClient.get(`${MMS_BASE_URL}/1.0/assay/plate/${plateId}/viabilityResult`);
        return response.data.data;
    }
}

export default {
    Get,
};
