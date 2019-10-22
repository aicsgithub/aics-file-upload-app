import { createLogic } from "redux-logic";
import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { ReduxLogicDoneCb, ReduxLogicNextCb, ReduxLogicProcessDependencies } from "../types";
import { batchActions } from "../util";
import { GET_TEMPLATE } from "./constants";

const getTemplateLogic = createLogic({
    process: async ({action, getState, mmsClient}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const { templateId, editTemplate } = action.payload;
        if (templateId) {
            try {
                dispatch(addRequestToInProgress(AsyncRequest.GET_TEMPLATE));
                const template = await mmsClient.getTemplate(templateId);
                dispatch(batchActions([

                ]));
            } catch (e) {
                dispatch(batchActions([
                    removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
                    setAlert({
                        message: "Could not retrieve template",
                        type: AlertType.ERROR,
                    }),
                ]));
            }
        }

        done();
    },
    type: GET_TEMPLATE,
});

export default [
    getTemplateLogic,
];
