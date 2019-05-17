import { AxiosError, AxiosResponse } from "axios";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { LABKEY_SELECT_ROWS_URL, LK_MICROSCOPY_SCHEMA } from "../../constants";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";

import { ReduxLogicDependencies } from "../types";

import { receiveMetadata } from "./actions";
import { REQUEST_METADATA } from "./constants";
import { LabkeyUnit, Unit } from "./types";

const requestMetadata = createLogic({
    process: ({httpClient}: ReduxLogicDependencies, dispatch: (action: AnyAction) => void,
              done: () => void) => {
        const getUnitsURL = LABKEY_SELECT_ROWS_URL(LK_MICROSCOPY_SCHEMA, "Units");
        return Promise.all([
            httpClient.get(getUnitsURL),
        ])
            .then(([getUnitsResponse]: AxiosResponse[]) => {
                const units: Unit[] = getUnitsResponse.data.rows.map((unit: LabkeyUnit) => ({
                    description: unit.Description,
                    name: unit.Name,
                    type: unit.Type,
                    unitsId: unit.UnitsId,
                }));
                dispatch(receiveMetadata({
                    units,
                }));
            })
            .catch((reason: AxiosError) => {
                console.log(reason); // tslint:disable-line:no-console
                dispatch(setAlert({
                    message: "Failed to retrieve metadata.",
                    type: AlertType.ERROR,
                }));
            })
            .then(done);
    },
    type: REQUEST_METADATA,
});

export default [
    requestMetadata,
];
