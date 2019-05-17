import { MMS_BASE_URL } from "../../constants";
import { GetPlateResponse, GetViabilityResultResponse } from "../../state/selection/types";
import { HttpClient } from "../../state/types";

class Get {
    public static async plate(httpClient: HttpClient, barcode: string): Promise<GetPlateResponse> {
        const response = await httpClient.get(`${MMS_BASE_URL}/1.0/plate/query?barcode=${barcode}`);
        return response.data.data[0];
    }

    public static async viabilityResults(httpClient: HttpClient, plateId: number):
        Promise<GetViabilityResultResponse[]> {
        const response = await httpClient.get(`${MMS_BASE_URL}/1.0/plate/${plateId}/assay/viabilityResult`);
        return response.data.data;
    }
}

export default {
    Get,
};
