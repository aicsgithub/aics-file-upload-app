import { LimsUrl } from "../../../shared/types";

export interface SettingStateBranch extends LimsUrl {
    schemaFilepaths: string[];
}

export interface AddSchemaFilepathAction {
    payload: string;
    type: string;
}

export interface RemoveSchemaFilepathAction {
    payload: string;
    type: string;
}

export interface UpdateSettingsAction {
    payload: Partial<SettingStateBranch>;
    type: string;
}

export interface GatherSettingsAction {
    type: string;
}

export interface SchemaDefinition {
    columns: ColumnDefinition[];
    notes?: string;
}

export interface ColumnDefinition {
    label: string;
    type: {
        type: ColumnType;
        dropdownValues: string[];
    };
    required: boolean;
}

export enum ColumnType {
    TEXT = 1,
    DROPDOWN = 2,
    BOOLEAN = 3,
    NUMBER = 4,
    DATE = 5,
    DATETIME = 6,
}
