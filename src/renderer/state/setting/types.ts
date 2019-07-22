import { LimsUrl } from "../../../shared/types";

// tslint:disable-next-line
export interface SettingStateBranch extends LimsUrl {
    // todo add more settings here
}

export interface UpdateSettingsAction {
    payload: Partial<SettingStateBranch>;
    type: string;
}

export interface GatherSettingsAction {
    type: string;
}

export interface CreateSchemaAction {
    payload: SchemaDefinition;
    type: string;
}

export interface SchemaDefinition {
    name: string;
    columns: ColumnDefinition[];
}

export interface ColumnDefinition {
    label: string;
    type: ColumnType;
    required: boolean;
}

export enum ColumnType {
    NUMBER = "NUMBER",
    TEXT = "TEXT",
    DATE = "DATE",
    BOOLEAN = "BOOLEAN",
}
