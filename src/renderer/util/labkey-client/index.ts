import axios from "axios";
import { map } from "lodash";

import { LABKEY_SELECT_ROWS_URL, LK_MICROSCOPY_SCHEMA } from "../../constants";
import { BarcodePrefix, ImagingSession } from "../../state/metadata/types";
import { Workflow } from "../../state/selection/types";
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

export interface LabKeyWorkflow {
    Description: string;
    Name: string;
    WorkflowId: number;
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
            prefix: barcodePrefix.Prefix,
            prefixId: barcodePrefix.PlateBarcodePrefixId,
        }));
    }

    /**
     * Retrieves all workflows
     * @param httpClient
     */
    public static async workflows(httpClient: HttpClient): Promise<Workflow[]> {
        const query = LABKEY_SELECT_ROWS_URL(LK_MICROSCOPY_SCHEMA, "Workflow");
        const response = await httpClient.get(query);
        return response.data.rows.map((workflow: LabKeyWorkflow) => ({
            description: workflow.Description,
            name: workflow.Name,
            workflowId: workflow.WorkflowId,
        }));
    }
}

export default {
    Get,
};
