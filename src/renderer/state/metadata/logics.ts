import { AxiosError, AxiosResponse } from "axios";
import { ipcRenderer } from "electron";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { LABKEY_SELECT_ROWS_URL, LK_MICROSCOPY_SCHEMA } from "../../constants";
import LabkeyClient from "../../util/labkey-client";
import { setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";

import { ReduxLogicNextCb, ReduxLogicProcessDependencies, ReduxLogicTransformDependencies } from "../types";

import { OPEN_CREATE_PLATE_STANDALONE } from "../../../shared/constants";
import { receiveMetadata } from "./actions";
import { CREATE_BARCODE, GET_BARCODE_PREFIXES, GET_IMAGING_SESSIONS, REQUEST_METADATA } from "./constants";
import { LabkeyUnit, Unit } from "./types";

const createBarcode = createLogic({
    transform: async ({httpClient, getState, action}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const { prefixId, imagingSession} = action.payload;
            let imagingSessionId = imagingSession && imagingSession.imagingSessionId;
            // LabKeyOptionSelector has a notable behavior where when you ask it to "Create an option" it will
            // set the id to be the same as the name, we are using that behavior here to see if it is an option that
            // needs to be entered into the database - Sean M 07/05/19
            if (imagingSession && imagingSessionId === imagingSession.name) {
                imagingSessionId = await LabkeyClient.Create.imagingSession(httpClient, imagingSession.name);
            }
            const barcode = await LabkeyClient.Create.barcode(httpClient, prefixId);
            next(receiveMetadata({
                barcode,
            }));
            ipcRenderer.send(OPEN_CREATE_PLATE_STANDALONE, barcode, imagingSessionId);
        } catch (ex) {
            next(setAlert({
                message: "Could not create barcode metadata",
                type: AlertType.ERROR,
            }));
        }
    },
    type: CREATE_BARCODE,
});

const requestMetadata = createLogic({
    process: ({httpClient}: ReduxLogicProcessDependencies, dispatch: (action: AnyAction) => void,
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

const requestImagingSessions = createLogic({
    transform: async ({httpClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const imagingSessions = await LabkeyClient.Get.imagingSessions(httpClient);
            next(receiveMetadata({
                imagingSessions,
            }));
        } catch (ex) {
            next(setAlert({
                message: "Could not retrieve imaging session metadata",
                type: AlertType.ERROR,
            }));
        }
    },
    type: GET_IMAGING_SESSIONS,
});

// TODO: Should this be a part of getting the metadata or is it preferred to have these sorts of things spread out?
const requestBarcodePrefixes = createLogic({
    transform: async ({httpClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const barcodePrefixes = await LabkeyClient.Get.barcodePrefixes(httpClient);
            next(receiveMetadata({
                barcodePrefixes,
            }));
        } catch (ex) {
            next(setAlert({
                message: "Could not retrieve barcode prefix metadata",
                type: AlertType.ERROR,
            }));
        }
    },
    type: GET_BARCODE_PREFIXES,
});

export default [
    createBarcode,
    requestMetadata,
    requestImagingSessions,
    requestBarcodePrefixes,
];
