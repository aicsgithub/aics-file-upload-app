import axios from "axios";
import { isEmpty, map } from "lodash";

import { DatabaseMetadata, Table } from "../../state/metadata/types";
import { BarcodePrefix, ImagingSession, LabkeyUnit, Unit } from "../../state/metadata/types";
import { Workflow } from "../../state/selection/types";
import HttpCacheClient from "../http-cache-client";
import {
    GetBarcodesResponse,
    GetTablesResponse,
    GetTablesResponseColumn,
    GetTablesResponseQuery,
    LabkeyImagingSession,
    LabkeyPlate,
    LabKeyPlateBarcodePrefix,
    LabkeyPlateResponse, LabKeyWorkflow,
} from "./types";

const LABKEY_GET_TABLES_URL = `/AICS/query-getQueries.api`;
const LK_MICROSCOPY_SCHEMA = "microscopy";

// There are more schemas, but these are the only ones (AFAIK) that users use
const SCHEMAS = [
    "assayscustom",
    "celllines",
    LK_MICROSCOPY_SCHEMA,
    "processing",
];

export default class LabkeyClient {
    private static getSelectRowsURL = (schema: string, table: string, additionalQueries: string[] = []) => {
        const base = `/AICS/query-selectRows.api?schemaName=${schema}&query.queryName=${table}`;
        if (!isEmpty(additionalQueries)) {
            return `${base}&${additionalQueries.join("&")}`;
        }

        return base;
    }

    public protocol: string;
    public host: string;
    public port: string;

    private get httpClient(): HttpCacheClient {
        // todo something more efficient?
        return new HttpCacheClient(axios.create({
            baseURL: this.baseURL,
        }), Boolean(process.env.ELECTRON_WEBPACK_USE_CACHE) || false);
    }

    constructor({host, port, protocol}: {host: string, port: string, protocol: string}) {
        this.protocol = protocol;
        this.host = host;
        this.port = port;
    }

    /**
     * Searches plates where the barcode contains searchString
     * @param searchString fragment of a barcode
     */
    public async getPlatesByBarcode(searchString: string):
        Promise<LabkeyPlateResponse[]> {
        const query = LabkeyClient.getSelectRowsURL("microscopy", "Plate", [
            `query.barcode~contains=${searchString}`,
        ]);

        const response: GetBarcodesResponse = await this.httpClient.get(query);
        const plates: LabkeyPlate[] = response.rows;
        return map(plates, (p) => ({
            barcode: p.BarCode,
            imagingSessionId: p.ImagingSessionId,
        }));
    }

    /**
     * Retrieves all imagingSessions
     */
    public async getImagingSessions(): Promise<ImagingSession[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "ImagingSession");
        const response = await this.httpClient.get(query);
        return response.rows.map((imagingSession: LabkeyImagingSession) => ({
            description: imagingSession.Description,
            imagingSessionId: imagingSession.ImagingSessionId,
            name: imagingSession.Name,
        }));
    }

    /**
     * Retrieves all barcodePrefixes
     */
    public async getBarcodePrefixes(): Promise<BarcodePrefix[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "PlateBarcodePrefix");
        const response = await this.httpClient.get(query);
        return response.rows.map((barcodePrefix: LabKeyPlateBarcodePrefix) => ({
            description: `${barcodePrefix.Prefix} - ${barcodePrefix.TeamName}`,
            prefix: barcodePrefix.Prefix,
            prefixId: barcodePrefix.PlateBarcodePrefixId,
        }));
    }

    /**
     * Retrieves all units
     */
    public async getUnits(): Promise<Unit[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Units");
        const response = await this.httpClient.get(query);
        return response.rows.map((unit: LabkeyUnit) => ({
            description: unit.Description,
            name: unit.Name,
            type: unit.Type,
            unitsId: unit.UnitsId,
        }));
    }

    /**
     * Retrieves all Table names and Table Column names for each Schema defined in the constant SCHEMAS
     */
    public async getDatabaseMetadata(): Promise<DatabaseMetadata> {
        const requests = SCHEMAS.map((schemaName: string) =>
            this.httpClient.post(LABKEY_GET_TABLES_URL, { schemaName })
        );
        const responses: GetTablesResponse[] = await Promise.all(requests);
        let tables: Table[] = [];
        responses.forEach(({ schemaName, queries }: GetTablesResponse) => {
            tables = [
                ...tables,
                ...queries
                // User defined queries have been broken in production before, we want to avoid breaking the app
                // because of them -- also it doesn't seem like we want to let the user to associate with a view
                    .filter(({ isUserDefined }: GetTablesResponseQuery) => !isUserDefined)
                    .map(({ columns, name }: GetTablesResponseQuery) => ({
                        columns: columns.map((column: GetTablesResponseColumn) => column.caption),
                        displayName: name,
                        name,
                        schemaName,
                    })),
            ];
        });
        // If any duplicate table name are present append the schemaName as a suffix
        return tables.reduce((acc: DatabaseMetadata, table: Table) => {
            const matchingTable = tables.find(({ name, schemaName }: Table) => (
                table.name === name && table.schemaName !== schemaName)
            );
            if (matchingTable) {
                const displayName = `${table.name} (${table.schemaName})`;
                return {
                    ...acc,
                    [displayName]: {
                        ...table,
                        displayName,
                    },
                };
            }
            return {
                ...acc,
                [table.name]: table,
            };
        }, {});
    }

    public async getColumnValues(schemaName: string,
                                 queryName: string,
                                 columnName: string): Promise<string[]> {
        const query = LabkeyClient.getSelectRowsURL(schemaName, queryName, [`query.columns=${columnName}`]);
        const response = await this.httpClient.get(query);
        return response.rows.map((columnValue: any) => columnValue[columnName]);
    }

    /**
     * Retrieves all workflows
     */
    public async getWorkflows(): Promise<Workflow[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Workflow");
        const response = await this.httpClient.get(query);
        return response.rows.map((workflow: LabKeyWorkflow) => ({
            description: workflow.Description,
            name: workflow.Name,
            workflowId: workflow.WorkflowId,
        }));
    }

    private get baseURL(): string {
        return `${this.protocol}://${this.host}:${this.port}/labkey`;
    }
}
