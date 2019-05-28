import axios from "axios";
import { map } from "lodash";

import { LABKEY_SELECT_ROWS_URL, LK_MICROSCOPY_SCHEMA } from "../../constants";
import { ImagingSession } from "../../state/metadata/types";
import { HttpClient } from "../../state/types";

interface LabkeyPlate {
    BarCode: string;
    ImagingSessionId: number;
}

interface GetBarcodesResponse {
    data: {
        rowCount: number,
        rows: LabkeyPlate[],
    };
}

export interface LabkeyImagingSession {
    ImagingSessionId: number;
    Name: string;
    Description: string;
}

class Get {
    /**
     * Searches plates where the barcode contains searchString
     * @param searchString fragment of a barcode
     */
    public static async platesByBarcode(searchString: string):
        Promise<Array<{barcode: string, imagingSessionId: number}>> {
        const query = LABKEY_SELECT_ROWS_URL("microscopy", "Plate", [
            `query.barcode~contains=${searchString}`,
        ]);

        const response: GetBarcodesResponse = await axios.get(query);
        const plates: LabkeyPlate[] = response.data.rows;
        return map(plates, (p) => ({
            barcode: p.BarCode,
            imagingSessionId: p.ImagingSessionId,
        }));
    }

    /**
     * Retrieves all imagingSessions
     * @param httpClient
     */
    public static async imagingSessions(httpClient: HttpClient): Promise<ImagingSession[]> {
        const query = LABKEY_SELECT_ROWS_URL(LK_MICROSCOPY_SCHEMA, "ImagingSession");
        const response = await httpClient.get(query);
        return response.data.rows.map((imagingSession: LabkeyImagingSession) => ({
            description: imagingSession.Description,
            imagingSessionId: imagingSession.ImagingSessionId,
            name: imagingSession.Name,
        }));
    }
}

export default {
    Get,
};
