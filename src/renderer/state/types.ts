import { IFileManagementSystem } from "@aics/aicsfiles/type-declarations/types";
import { IJobStatusClient } from "@aics/job-status-client/type-declarations/types";
import { AxiosPromise, AxiosRequestConfig } from "axios";
import { MessageBoxOptions } from "electron";
import { AnyAction } from "redux";
import { CreateLogic } from "redux-logic/definitions/logic";
import { StateWithHistory } from "redux-undo";

import { FeedbackStateBranch } from "./feedback/types";
import { JobStateBranch } from "./job/types";
import { BarcodePrefix, DatabaseMetadata, ImagingSession, MetadataStateBranch, Unit } from "./metadata/types";
import { SelectionStateBranch } from "./selection/types";
import { SettingStateBranch } from "./setting/types";
import { UploadStateBranch } from "./upload/types";
import Process = CreateLogic.Config.Process;
import DepObj = CreateLogic.Config.DepObj;

export interface ActionDescription {
    accepts: (action: AnyAction) => boolean;
    perform: (state: any, action: any) => any;
}

export interface BatchedAction {
    type: string;
    batch: boolean;
    payload: AnyAction[];
}

export interface HttpClient {
    get<T = any>(url: string, config?: AxiosRequestConfig): AxiosPromise<T>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): AxiosPromise<T>;
}

export interface ReduxLogicExtraDependencies {
    ctx?: any;
    dialog: {
        showMessageBox(
            options: MessageBoxOptions,
            callback?: (response: number, checkboxChecked: boolean) => void
        ): number;
    };
    fms: IFileManagementSystem;
    httpClient: HttpClient;
    ipcRenderer: {
        on: (channel: string, listener: (...args: any[]) => void) => void;
        send: (channel: string, ...args: any[]) => void;
    };
    jssClient: IJobStatusClient;
    labkeyClient: {
        getBarcodePrefixes: () => Promise<BarcodePrefix[]>;
        getColumnValues: (schema: string, table: string, columnName: string) => Promise<string[]>;
        getDatabaseMetadata: () => Promise<DatabaseMetadata>;
        getImagingSessions: () => Promise<ImagingSession[]>;
        getUnits: () => Promise<Unit[]>;
    };
    storage: {
        get: (key: string) => any,
        has: (key: string) => boolean;
        set: (key: string, value: any) => void;
    };
}

export type ReduxLogicProcessDependencies = Process.DepObj<State, AnyAction, ReduxLogicExtraDependencies>;
export type ReduxLogicTransformDependencies = DepObj<State, AnyAction, ReduxLogicExtraDependencies>;

export type ReduxLogicNextCb = (action: AnyAction) => void;
export type ReduxLogicRejectCb = () => void;
export type ReduxLogicDoneCb = () => void;

export interface State {
    feedback: FeedbackStateBranch;
    job: JobStateBranch;
    metadata: MetadataStateBranch;
    selection: StateWithHistory<SelectionStateBranch>;
    setting: SettingStateBranch;
    upload: StateWithHistory<UploadStateBranch>;
}

export interface TypeToDescriptionMap {
    [propName: string ]: ActionDescription;
}

export interface AicsResponse {
    responseType: "SUCCESS" | "SERVER_ERROR" | "CLIENT_ERROR";
}

export interface AicsSuccessResponse<T> extends AicsResponse {
    data: T[];
    totalCount: number;
    hasMore?: boolean;
    offset: number;
}

export interface Audited {
    created: string; // Date string
    createdBy: number;
    modified: string; // Date string
    modifiedBy: number;
}

export enum HTTP_STATUS {
    BAD_GATEWAY = 502,
    BAD_REQUEST = 400,
    INTERNAL_SERVER_ERROR = 500,
    OK = 200,
}
