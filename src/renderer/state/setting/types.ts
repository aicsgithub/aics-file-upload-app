import { LimsUrl } from "../../../shared/types";

// tslint:disable-next-line
export interface SettingStateBranch extends LimsUrl {
    // todo add more settings here
}

export interface UpdateSettingsAction {
    payload: Partial<SettingStateBranch>;
    type: string;
}
