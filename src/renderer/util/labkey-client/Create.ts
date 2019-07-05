import { LABKEY_URL, LK_MICROSCOPY_SCHEMA, MMS_BASE_URL } from "../../constants";
import { HttpClient } from "../../state/types";

export default class Create {
    /**
     * Creates a barcode with a given prefix
     * @param httpClient
     * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
     */
    public static async barcode(httpClient: HttpClient, prefixId: number): Promise<string> {
        const url = `${MMS_BASE_URL}/1.0/plate/barcode`;
        const data = { prefixId, quantity: 1 };
        // TODO: Find the user's x-user-id
        const response = await httpClient.post(url, data, { headers: { "X-User-Id": "seanm" } });
        return response.data.data[0];
    }

    /**
     * Creates an imagingSession with the given name
     * @param httpClient
     * @param name, the name of the imagingSession
     */
    public static async imagingSession(httpClient: HttpClient, name: string): Promise<number> {
        const url = `${LABKEY_URL}/AICS/query-insertRows.api`;
        const data = {
            queryName: "ImagingSession",
            rows: [{ name }],
            schemaName: LK_MICROSCOPY_SCHEMA,
        };
        const response = await httpClient.post(url, data); // TODO: Fix 401 auth issue
        return response.data.rows[0].imagingsessionid;
    }
}
