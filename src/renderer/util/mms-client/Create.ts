import os from "os";
import { MMS_BASE_URL } from "../../constants";
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
        const userName = os.userInfo().username;
        const response = await httpClient.post(url, data, { headers: { "X-User-Id": userName } });
        return response.data.data[0];
    }
}
