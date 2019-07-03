import axios from "axios";
import { map } from "lodash";

import {LABKEY_SELECT_ROWS_URL, LK_MICROSCOPY_SCHEMA, MMS_BASE_URL} from "../../constants";
import { BarcodePrefix, ImagingSession } from "../../state/metadata/types";
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

export interface LabKeyPlateBarcodePrefix {
    PlateBarcodePrefixId: number;
    Prefix: string;
    TeamName: string;
}

class Create {
    /**
     * Creates a barcode with a given prefix
     * @param httpClient
     * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
     */
    public static async barcode(httpClient: HttpClient, prefixId: number): Promise<string> {
        const url = `${MMS_BASE_URL}/1.0/plate/barcode`;
        const data = { prefixId, quantity: 1 };
        const response = await httpClient.post(url, data);
        return response.data.data[0];
    }
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

    /**
     * Retrieves all barcodePrefixes
     * @param httpClient
     */
    public static async barcodePrefixes(httpClient: HttpClient): Promise<BarcodePrefix[]> {
        const query = LABKEY_SELECT_ROWS_URL(LK_MICROSCOPY_SCHEMA, "PlateBarcodePrefix");
        const response = await httpClient.get(query);
        return response.data.rows.map((barcodePrefix: LabKeyPlateBarcodePrefix) => ({
            description: `${barcodePrefix.Prefix} - ${barcodePrefix.TeamName}`,
            prefixId: barcodePrefix.PlateBarcodePrefixId,
            prefix: barcodePrefix.Prefix
        }));
    }
}

export default {
    Get,
    Create
};
