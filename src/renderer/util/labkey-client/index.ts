import { camelizeKeys } from "humps";
import { isEmpty, map, pick } from "lodash";

import { Channel } from "../../state/metadata/types";
import { BarcodePrefix, ImagingSession, LabkeyUnit, Unit } from "../../state/metadata/types";
import { Workflow } from "../../state/selection/types";
import { Annotation, AnnotationLookup, AnnotationOption, AnnotationType, Lookup } from "../../state/template/types";
import { LocalStorage } from "../../state/types";
import BaseServiceClient from "../base-service-client";
import {
    LabkeyAnnotation,
    LabkeyAnnotationLookup,
    LabkeyAnnotationOption,
    LabkeyAnnotationType,
    LabkeyChannel,
    LabkeyImagingSession,
    LabkeyLookup,
    LabkeyPlate,
    LabKeyPlateBarcodePrefix,
    LabkeyPlateResponse,
    LabkeyResponse,
    LabkeyTemplate,
    LabkeyUser,
    LabKeyWorkflow,
} from "./types";

const LK_FILEMETADATA_SCHEMA = "filemetadata";
const LK_MICROSCOPY_SCHEMA = "microscopy";
const LK_PROCESSING_SCHEMA = "processing";
const LK_UPLOADER_SCHEMA = "uploader";

export default class LabkeyClient extends BaseServiceClient {
    private static getSelectRowsURL = (schema: string, table: string, additionalQueries: string[] = []) => {
        const base = `/AICS/query-selectRows.api?schemaName=${schema}&query.queryName=${table}`;
        if (!isEmpty(additionalQueries)) {
            return `${base}&${additionalQueries.join("&")}`;
        }

        return base;
    }

    constructor(config: {host: string, localStorage: LocalStorage, port: string, protocol: string}) {
        super(config);
    }

    /**
     * Gets all annotation types
     */
    public async getAnnotationTypes(): Promise<AnnotationType[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "AnnotationType");
        const { rows } = await this.httpClient.get(query);
        return rows.map((r: LabkeyAnnotationType) => camelizeKeys(pick(r, ["AnnotationTypeId", "Name"])));
    }

    /**
     * Gets all annotations
     */
    public async getAnnotations(): Promise<Annotation[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "Annotation");
        const { rows } = await this.httpClient.get(query);
        return rows.map((r: LabkeyAnnotation) => camelizeKeys(pick(r,
            ["AnnotationId", "AnnotationTypeId", "Description",
                "Name", "CreatedBy", "Created", "ModifiedBy", "Modified"]
        )));
    }

    public async getAnnotationLookups(): Promise<AnnotationLookup[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "AnnotationLookup");
        const { rows } = await this.httpClient.get(query);
        return rows.map((r: LabkeyAnnotationLookup) => camelizeKeys(pick(r, ["AnnotationId", "LookupId"])));
    }

    public async getAnnotationOptions(): Promise<AnnotationOption[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "AnnotationOption");
        const { rows } = await this.httpClient.get(query);
        return rows.map((r: LabkeyAnnotationOption) =>
            camelizeKeys(pick(r, ["AnnotationOptionId", "AnnotationId", "Value"])));
    }

    public async getOptionsForLookup(lookupId: number): Promise<string[]> {
        const lookupQuery = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "Lookup",
            [`query.lookupId~eq=${lookupId}`]);
        const lookupResponse = await this.httpClient.get(lookupQuery);
        if (!lookupResponse || !lookupResponse.rows || !lookupResponse.rows.length) {
            throw Error(`Unable to find lookup information, response: ${lookupResponse}`);
        }
        const { SchemaName, TableName, ColumnName } = lookupResponse.rows[0];
        const lookupOptionsQuery = LabkeyClient.getSelectRowsURL(SchemaName, TableName,
            [`query.columns=${ColumnName}`]);
        const { rows } = await this.httpClient.get(lookupOptionsQuery);
        // Column names for lookups are stored in lowercase in the DB while the actual key may have any casing,
        // so we need to find the matching key
        const properlyCasedKey = Object.keys(rows[0]).find((key) => key.toLowerCase() === ColumnName.toLowerCase());
        return rows.map((row: any) => row[properlyCasedKey!]);
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

        const response: LabkeyResponse<LabkeyPlate> = await this.httpClient.get(query);
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

    public async getLookups(): Promise<Lookup[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "Lookup");
        const { rows } = await this.httpClient.get(query);
        return rows.map((r: LabkeyLookup) => camelizeKeys(pick(r,
            ["LookupId", "ColumnName", "DescriptionColumn", "SchemaName", "TableName"]
        )));
    }

    public async getTemplates(): Promise<LabkeyTemplate[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_UPLOADER_SCHEMA, "Template");
        const response = await this.httpClient.get(query);
        return response.rows;
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
     * Retrieves all users in LabKey from a special view
     */
    public async getUsers(): Promise<LabkeyUser[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "User");
        const response = await this.httpClient.get(query);
        return response.rows;
    }

    public async getColumnValues(schemaName: string,
                                 queryName: string,
                                 columnName: string): Promise<string[]> {
        const query = LabkeyClient.getSelectRowsURL(schemaName, queryName, [`query.columns=${columnName}`]);
        const response: LabkeyResponse<any> = await this.httpClient.get(query);
        // labkey casing may be different than what is saved in the Lookup table
        columnName = response.columnModel[0].dataIndex;
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

    public async getChannels(): Promise<Channel[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_PROCESSING_SCHEMA, "ContentType");
        const response = await this.httpClient.get(query);
        return response.rows.map((channel: LabkeyChannel) => ({
            channelId: channel.ContentTypeId,
            description: channel.Description,
            name: channel.Name,
        }));
    }

    protected get baseURL(): string {
        return `${this.protocol}://${this.host}:${this.port}/labkey`;
    }
}
