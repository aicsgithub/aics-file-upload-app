import axios from "axios";

import { LABKEY_SELECT_ROWS_URL, LK_MICROSCOPY_SCHEMA } from "../../constants";
import { HttpClient } from "../../state/types";

export interface Plate {
    BarCode: string;
    ImagingSessionId: string;
}
interface GetBarcodesResponse {
    data: {
        rowCount: number,
        rows: Plate[],
    };
}

export interface ImagingSession {
    ImagingSessionId: number;
    Name: string;
    Description: string;
}

class Get {
    public static platesByBarcode(searchString: string): Promise<Plate[]> {
        const query = LABKEY_SELECT_ROWS_URL("microscopy", "Plate", [
            `query.barcode~contains=${searchString}`,
        ]);

        return axios.get(query)
            .then((response: GetBarcodesResponse) => {
                return response.data.rows;
            });
    }

    public static async imagingSessions(httpClient: HttpClient): Promise<ImagingSession[]> {
        const query = LABKEY_SELECT_ROWS_URL(LK_MICROSCOPY_SCHEMA, "ImagingSession");
        const response = await httpClient.get(query);
        return response.data.rows;
    }
}

export default {
    Get,
};
