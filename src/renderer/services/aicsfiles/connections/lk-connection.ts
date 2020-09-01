import { AxiosRequestConfig } from "axios";
import { camelizeKeys } from "humps";
import { isEmpty, pick } from "lodash";

import { HeaderMap } from "../../types";
import { Filter, FilterType, LabKeyResponse } from "../types";

import { ConnectionBase } from "./connection-base";

const IN_SEPARATOR = "%3B";

/*
    Client interface for interacting with LabKey
 */
export class LabKeyConnection extends ConnectionBase {
  private static readonly servicePath = "labkey/AICS";

  public static createFilter(
    filterColumn: string,
    searchValue: any | any[] = undefined,
    type: FilterType = FilterType.EQUALS
  ): Filter {
    return { filterColumn, searchValue, type };
  }

  private static getSelectRowsURL = (
    schema: string,
    table: string,
    additionalQueries: string[] = []
  ) => {
    const base = `query-selectRows.api?schemaName=${schema}&query.queryName=${table}`;
    if (isEmpty(additionalQueries)) {
      return base;
    }
    return `${base}&${additionalQueries.join("&")}`;
  };

  public constructor(host: string, port: string, user: string) {
    super(host, port, user, LabKeyConnection.servicePath);
  }

  // Returns the LabKey query
  public async selectRows(
    schema: string,
    table: string,
    columns?: string[],
    filters?: Filter[]
  ): Promise<LabKeyResponse<any>> {
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
    const url = LabKeyConnection.getSelectRowsURL(
      schema,
      table,
      additionalQueries
    );
    const response = await this.get<any>(url);
    this.logger.info(response);
    // Return LabKeyResponse in the same shape, but with camelized column names
    return response["rows"]
      ? {
          ...response,
          rows: response["rows"].map((row) =>
            camelizeKeys(pick(row, Object.keys(row)))
          ),
        }
      : { rows: [] };
  }

  // Return the first value returned from the LabKey query
  public async selectFirst(
    schema: string,
    table: string,
    columns?: string[],
    filters?: Filter[]
  ): Promise<any> {
    const rows = await this.selectRowsAsList(schema, table, columns, filters);
    if (!rows.length) {
      throw new Error(`Expected at least one value, received none. 
                             Query: ${schema} ${table} ${columns} ${
        filters && JSON.stringify(filters)
      }`);
    }
    return rows[0];
  }

  // Returns LabKey query as a an array of values
  public selectRowsAsList(
    schema: string,
    table: string,
    columns?: string[],
    filters?: Filter[]
  ): Promise<any[]> {
    return this.selectRows(schema, table, columns, filters).then(
      (response) => response["rows"]
    );
  }

  // Override ConnectionBase config to avoid returning default headers, they cause errors with LabKey
  protected getAxiosConfig(
    headers: HeaderMap = {},
    timeout: number
  ): AxiosRequestConfig {
    return { headers, timeout };
  }

  protected get extraAxiosConfig(): AxiosRequestConfig {
    return {};
  }
}
