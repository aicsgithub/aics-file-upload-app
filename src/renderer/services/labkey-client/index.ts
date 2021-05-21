import { camelizeKeys } from "humps";
import { isEmpty, map, pick, uniq } from "lodash";

import { LocalStorage } from "../../types";
import { Filter, FilterType, LabKeyResponse } from "../aicsfiles/types";
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
  Lookup,
  Unit,
} from "./types";

const LK_FILEMETADATA_SCHEMA = "filemetadata";
const LK_FMS_SCHEMA = "fms";
const LK_MICROSCOPY_SCHEMA = "microscopy";
const LK_PROCESSING_SCHEMA = "processing";
const LK_UPLOADER_SCHEMA = "uploader";
const BASE_URL = "/labkey";
const IN_SEPARATOR = "%3B";

export default class LabkeyClient extends HttpCacheClient {
  public static createFilter(
    filterColumn: string,
    searchValue: any | any[] = undefined,
    type: FilterType = FilterType.EQUALS
  ): Filter {
    return { filterColumn, searchValue, type };
  }

  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache: boolean
  ) {
    super(httpClient, localStorage, useCache);
    this.getAnnotationTypes = this.getAnnotationTypes.bind(this);
    this.getAnnotations = this.getAnnotations.bind(this);
    this.getAnnotationLookups = this.getAnnotationLookups.bind(this);
    this.getAnnotationOptions = this.getAnnotationOptions.bind(this);
    this.getOptionsForLookup = this.getOptionsForLookup.bind(this);
    this.getPlatesByBarcode = this.getPlatesByBarcode.bind(this);
    this.getImagingSessions = this.getImagingSessions.bind(this);
    this.getBarcodePrefixes = this.getBarcodePrefixes.bind(this);
    this.getLookups = this.getLookups.bind(this);
    this.getTemplates = this.getTemplates.bind(this);
    this.getUnits = this.getUnits.bind(this);
    this.getColumnValues = this.getColumnValues.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getTemplateHasBeenUsed = this.getTemplateHasBeenUsed.bind(this);
    this.getPlateBarcodeAndAllImagingSessionIdsFromWellId = this.getPlateBarcodeAndAllImagingSessionIdsFromWellId.bind(
      this
    );
    this.getImagingSessionIdsForBarcode = this.getImagingSessionIdsForBarcode.bind(
      this
    );
    this.getFileExistsByMD5AndName = this.getFileExistsByMD5AndName.bind(this);
    this.selectRows = this.selectRows.bind(this);
    this.selectFirst = this.selectFirst.bind(this);
    this.selectRowsAsList = this.selectRowsAsList.bind(this);
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
   * Returns true if the annotation has been used in an upload before
   */
  public async checkForAnnotationValues(
    annotationId: number
  ): Promise<boolean> {
    const query = LabkeyClient.getSelectRowsURL(
      LK_FILEMETADATA_SCHEMA,
      "CustomAnnotationJunction",
      [`query.AnnotationId~eq=${annotationId}`]
    );
    const { rows } = await this.get(query);
    return rows.length !== 0;
  }

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
    searchString = ""
  ): Promise<string[]> {
    const additionalQueries = [
      `query.columns=${column}`,
      `query.sort=${column}`,
      `query.maxRows=100`,
    ];
    if (!isEmpty(searchString)) {
      additionalQueries.push(
        `query.${column}~contains=${encodeURIComponent(searchString)}`
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
      `query.barcode~contains=${encodeURIComponent(searchString)}`,
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
      `query.barcode~eq=${encodeURIComponent(barcode)}`,
    ]);
    const response = await this.get(query);
    if (response.rows.length) {
      return uniq(
        response.rows.map((plate: LabkeyPlate) => plate.ImagingSessionId)
      );
    }
    return [];
  }

  public async getFileExistsByMD5AndName(
    md5: string,
    name: string
  ): Promise<boolean> {
    const query = LabkeyClient.getSelectRowsURL(LK_FMS_SCHEMA, "File", [
      `query.FileName~eq=${name}`,
      `query.MD5~eq=${md5}`,
    ]);
    const response = await this.get(query);
    return response.rows.length > 0;
  }

  // Returns the LabKey query
  public async selectRows<T = any>(
    schema: string,
    table: string,
    columns?: string[],
    filters?: Filter[]
  ): Promise<LabKeyResponse<T>> {
    const additionalQueries: string[] = [];
    if (columns && columns.length) {
      additionalQueries.push(`query.columns=${columns}`);
    }
    if (filters) {
      filters.forEach((filter) => {
        let filterValue = filter.searchValue;
        if (typeof filterValue === "string") {
          filterValue = filterValue.replace(/&/g, "%26"); // LK doesn't like "&" in strings
        }
        if (filter.type === FilterType.EQUALS) {
          additionalQueries.push(
            `query.${filter.filterColumn}~eq=${filterValue}`
          );
        } else if (filter.type === FilterType.IN) {
          additionalQueries.push(
            `query.${filter.filterColumn}~in=${filterValue.join(IN_SEPARATOR)}`
          );
        } else {
          throw new Error("Unsupported filter type");
        }
      });
    }
    const url = LabkeyClient.getSelectRowsURL(schema, table, additionalQueries);
    const response = await this.get<LabkeyResponse<any>>(url);
    // Return LabKeyResponse in the same shape, but with camelized column names
    return response["rows"]
      ? {
          ...response,
          rows: response["rows"].map(
            (row: any) =>
              (camelizeKeys(pick(row, Object.keys(row))) as any) as T
          ),
        }
      : { rows: [] };
  }

  // Return the first value returned from the LabKey query
  public async selectFirst<T = any>(
    schema: string,
    table: string,
    columns?: string[],
    filters?: Filter[]
  ): Promise<T> {
    const rows = await this.selectRowsAsList<T>(
      schema,
      table,
      columns,
      filters
    );
    if (!rows.length) {
      throw new Error(`Expected at least one value, received none. 
                             Query: ${schema} ${table} ${columns} ${
        filters && JSON.stringify(filters)
      }`);
    }
    return rows[0];
  }

  // Returns LabKey query as a an array of values
  public selectRowsAsList<T = any>(
    schema: string,
    table: string,
    columns?: string[],
    filters?: Filter[]
  ): Promise<T[]> {
    return this.selectRows<T>(schema, table, columns, filters).then(
      (response) => response["rows"]
    );
  }
}
