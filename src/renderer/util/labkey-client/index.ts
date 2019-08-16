import axios, { AxiosPromise, AxiosResponse } from "axios";
import { map } from "lodash";

import { DatabaseMetadata, Table } from "../../state/metadata/types";
import { BarcodePrefix, ImagingSession, LabkeyUnit, Unit } from "../../state/metadata/types";
import { HttpClient } from "../../state/types";
import {
    LABKEY_GET_TABLES_URL,
    LABKEY_SELECT_ROWS_URL,
    LK_MICROSCOPY_SCHEMA,
    SCHEMAS,
} from "../../constants";

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

interface GetTablesResponseColumn {
    caption: string; // name with spaces (ex. DonorPlasmidBatch -> Donor Plasmid Batch)
    name: string; // actual name
}

interface GetTablesResponseQuery {
    columns: GetTablesResponseColumn[];
    isUserDefined: boolean; // is the query defined in a codebase or in LK memory
    name: string;
}

interface GetTablesResponse {
    schemaName: string;
    queries: GetTablesResponseQuery[];
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
     * Retrieves all units
     * @param httpClient
     */
    public static async units(httpClient: HttpClient): Promise<Unit[]> {
        const query = LABKEY_SELECT_ROWS_URL(LK_MICROSCOPY_SCHEMA, "Units");
        const response = await httpClient.get(query);
        return response.data.rows.map((unit: LabkeyUnit) => ({
            description: unit.Description,
            name: unit.Name,
            type: unit.Type,
            unitsId: unit.UnitsId,
        }));
    }

    /**
     * Retrieves all Table names and Table Column names for each Schema defined in the constant SCHEMAS
     * @param httpClient
     */
    public static async databaseMetadata(httpClient: HttpClient): Promise<DatabaseMetadata> {
        const requests: AxiosPromise<GetTablesResponse>[] = SCHEMAS.map((schemaName: string) =>
            httpClient.post(LABKEY_GET_TABLES_URL(), { schemaName })
        );
        const responses: AxiosResponse<GetTablesResponse>[] = await Promise.all(requests);
        console.log(responses);
        let tables: Table[] = [];
        responses.forEach(({ data: { schemaName, queries } }: AxiosResponse<GetTablesResponse>) => {
            tables = [
                ...tables,
                ...queries
                    // User defined queries have been broken in production before, we want to avoid breaking out app
                    // because of them -- also it doesn't seem like we want to let the user to associate with a view
                    .filter(({ isUserDefined }: GetTablesResponseQuery) => !isUserDefined)
                    .map(({ columns, name }: GetTablesResponseQuery) => ({
                        columns: columns.map((column: GetTablesResponseColumn) => column.caption),
                        displayName: name,
                        name,
                        schemaName,
                    })),
            ]
        });
        // If any duplicate table name are present append the schemaName as a prefix
        return tables.reduce((acc: DatabaseMetadata, table: Table) => {
            const matchingTable = tables.find(({ name, schemaName }: Table) => (
                table.name === name && table.schemaName !== schemaName)
            );
            if (matchingTable) {
                const displayName = `${table.schemaName}.${table.name}`;
                return {
                    ...acc,
                    [displayName]: {
                        ...table,
                        displayName
                    },
                };
            }
            return {
                ...acc,
                [table.name]: table,
            };
        }, {});
    }

    public static async ColumnValues(httpClient: HttpClient,
                                     schemaName: string,
                                     queryName: string,
                                     columnName: string): Promise<string[]> {
        const query = LABKEY_SELECT_ROWS_URL(schemaName, queryName, [`query.columns=${columnName}`]);
        const response = await httpClient.get(query);
        return response.data.rows.map((columnValue: any) => columnValue[columnName]);
    }
}

export default {
    Get,
};
