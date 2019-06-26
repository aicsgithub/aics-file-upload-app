import { MMS_BASE_URL } from "../../constants";
import { GetPlateResponse } from "../../state/selection/types";
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
}

export default {
    Get,
};
