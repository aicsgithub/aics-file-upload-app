import { camelizeKeys } from "humps";
import { isEmpty, map, pick, uniq } from "lodash";

import { LocalStorage } from "../../state/types";
import HttpCacheClient from "../http-cache-client";
import { HttpClient } from "../types";

import {
  Annotation,
  AnnotationLookup,
  AnnotationOption,
  AnnotationType,
  BarcodePrefix,
  Channel,
  ImagingSession,
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
  LabkeyUnit,
  LabkeyUser,
  LabKeyWorkflow,
  Lookup,
  Unit,
  Workflow,
} from "./types";

const LK_FILEMETADATA_SCHEMA = "filemetadata";
const LK_MICROSCOPY_SCHEMA = "microscopy";
const LK_PROCESSING_SCHEMA = "processing";
const LK_UPLOADER_SCHEMA = "uploader";
const BASE_URL = "/labkey";

export default class LabkeyClient extends HttpCacheClient {
  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache: boolean
  ) {
    super(httpClient, localStorage, useCache);
  }
  private static getSelectRowsURL = (
    schema: string,
    table: string,
    additionalQueries: string[] = []
  ) => {
    const base = `${BASE_URL}/AICS/query-selectRows.api?schemaName=${schema}&query.queryName=${table}`;
    if (!isEmpty(additionalQueries)) {
      return `${base}&${additionalQueries.join("&")}`;
    }

    return base;
  };

  /**
   * Gets all annotation types
   */
  public async getAnnotationTypes(): Promise<AnnotationType[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_FILEMETADATA_SCHEMA,
      "AnnotationType"
    );
    const { rows } = await this.get(query);
    return rows.map((r: LabkeyAnnotationType) =>
      camelizeKeys(pick(r, ["AnnotationTypeId", "Name"]))
    );
  }

  /**
   * Gets all annotations
   */
  public async getAnnotations(): Promise<Annotation[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_FILEMETADATA_SCHEMA,
      "Annotation"
    );
    const { rows } = await this.get(query);
    return rows.map((r: LabkeyAnnotation) =>
      camelizeKeys(
        pick(r, [
          "AnnotationId",
          "AnnotationTypeId",
          "Description",
          "ExposeToFileUploadApp",
          "Name",
          "CreatedBy",
          "Created",
          "ModifiedBy",
          "Modified",
        ])
      )
    );
  }

  public async getAnnotationLookups(): Promise<AnnotationLookup[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_FILEMETADATA_SCHEMA,
      "AnnotationLookup"
    );
    const { rows } = await this.get(query);
    return rows.map((r: LabkeyAnnotationLookup) =>
      camelizeKeys(pick(r, ["AnnotationId", "LookupId"]))
    );
  }

  public async getAnnotationOptions(): Promise<AnnotationOption[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_FILEMETADATA_SCHEMA,
      "AnnotationOption"
    );
    const { rows } = await this.get(query);
    return rows.map((r: LabkeyAnnotationOption) =>
      camelizeKeys(pick(r, ["AnnotationOptionId", "AnnotationId", "Value"]))
    );
  }

  /**
   * Gets the values for a lookup based on the column provided
   * @param schema of the lookup
   * @param table of the lookup
   * @param column of the lookup
   * @param searchString optional string. if provided, the number of rows returned will be limited to 30 since it is
   * assumed that there could potentially be many more than that.
   */
  public async getOptionsForLookup(
    schema: string,
    table: string,
    column: string,
    searchString?: string
  ): Promise<string[]> {
    const additionalQueries = [
      `query.columns=${column}`,
      `query.sort=${column}`,
    ];
    if (!isEmpty(searchString)) {
      additionalQueries.push(
        `query.${column}~contains=${searchString}`,
        `query.maxRows=30`
      );
    }
    const lookupOptionsQuery = LabkeyClient.getSelectRowsURL(
      schema,
      table,
      additionalQueries
    );
    const { rows } = await this.get(lookupOptionsQuery);
    // Column names for lookups are stored in lowercase in the DB while the actual key may have any casing,
    // so we need to find the matching key
    if (isEmpty(rows)) {
      return rows;
    }
    const properlyCasedKey = Object.keys(rows[0]).find(
      (key) => key.toLowerCase() === column.toLowerCase()
    );
    if (!properlyCasedKey) {
      throw new Error(
        `Could not find column named ${column} in ${schema}.${table}`
      );
    }
    return rows.map((row: any) => row[properlyCasedKey]);
  }

  /**
   * Searches plates where the barcode contains searchString
   * @param searchString fragment of a barcode
   */
  public async getPlatesByBarcode(
    searchString: string
  ): Promise<LabkeyPlateResponse[]> {
    const query = LabkeyClient.getSelectRowsURL("microscopy", "Plate", [
      `query.barcode~contains=${searchString}`,
      `query.maxRows=30`,
    ]);

    const response: LabkeyResponse<LabkeyPlate> = await this.get(query);
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
    const query = LabkeyClient.getSelectRowsURL(
      LK_MICROSCOPY_SCHEMA,
      "ImagingSession"
    );
    const response = await this.get(query);
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
    const query = LabkeyClient.getSelectRowsURL(
      LK_MICROSCOPY_SCHEMA,
      "PlateBarcodePrefix"
    );
    const response = await this.get(query);
    return response.rows.map((barcodePrefix: LabKeyPlateBarcodePrefix) => ({
      description: `${barcodePrefix.Prefix} - ${barcodePrefix.TeamName}`,
      prefix: barcodePrefix.Prefix,
      prefixId: barcodePrefix.PlateBarcodePrefixId,
    }));
  }

  public async getLookups(): Promise<Lookup[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_FILEMETADATA_SCHEMA,
      "Lookup"
    );
    const { rows } = await this.get(query);
    return rows.map((r: LabkeyLookup) =>
      camelizeKeys(
        pick(r, [
          "LookupId",
          "ColumnName",
          "DescriptionColumn",
          "SchemaName",
          "TableName",
        ])
      )
    );
  }

  public async getTemplates(): Promise<LabkeyTemplate[]> {
    const query = LabkeyClient.getSelectRowsURL(LK_UPLOADER_SCHEMA, "Template");
    const response = await this.get(query);
    return response.rows;
  }

  /**
   * Retrieves all units
   */
  public async getUnits(): Promise<Unit[]> {
    const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Units");
    const response = await this.get(query);
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
    const response = await this.get(query);
    return response.rows;
  }

  public async getColumnValues(
    schemaName: string,
    queryName: string,
    columnName: string
  ): Promise<string[]> {
    const query = LabkeyClient.getSelectRowsURL(schemaName, queryName, [
      `query.columns=${columnName}`,
    ]);
    const response: LabkeyResponse<any> = await this.get(query);
    // labkey casing may be different than what is saved in the Lookup table
    columnName = response.columnModel[0].dataIndex;
    return response.rows.map((columnValue: any) => columnValue[columnName]);
  }

  /**
   * Retrieves all workflows
   */
  public async getWorkflows(): Promise<Workflow[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_MICROSCOPY_SCHEMA,
      "Workflow"
    );
    const response = await this.get(query);
    return response.rows.map((workflow: LabKeyWorkflow) => ({
      description: workflow.Description,
      name: workflow.Name,
      workflowId: workflow.WorkflowId,
    }));
  }

  public async getChannels(): Promise<Channel[]> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_PROCESSING_SCHEMA,
      "ContentType"
    );
    const response = await this.get(query);
    return response.rows.map((channel: LabkeyChannel) => ({
      channelId: channel.Name,
      description: channel.Description,
    }));
  }

  public async getTemplateHasBeenUsed(templateId: number): Promise<boolean> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_UPLOADER_SCHEMA,
      "FileTemplateJunction",
      [`query.TemplateId~eq=${templateId}`]
    );
    const response = await this.get(query);
    return response.rows.length > 0;
  }

  public async getPlateBarcodeAndAllImagingSessionIdsFromWellId(
    wellId: number
  ): Promise<string> {
    const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Well", [
      `query.wellid~eq=${wellId}`,
    ]);
    const response = await this.get(query);
    const plateId: number | undefined = response.rows[0]?.PlateId;
    if (!plateId) {
      throw new Error("could not find plate from wellId");
    }
    const plateQuery = LabkeyClient.getSelectRowsURL(
      LK_MICROSCOPY_SCHEMA,
      "Plate",
      [`query.plateid~eq=${plateId}`]
    );
    const plateResponse = await this.get(plateQuery);
    return plateResponse.rows[0]?.BarCode;
  }

  public async getImagingSessionIdsForBarcode(
    barcode: string
  ): Promise<Array<number | null>> {
    const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Plate", [
      `query.barcode~eq=${barcode}`,
    ]);
    const response = await this.get(query);
    if (response.rows.length) {
      return uniq(
        response.rows.map((plate: LabkeyPlate) => plate.ImagingSessionId)
      );
    }
    return [];
  }
}
