import { createLogic } from "redux-logic";
import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { selectTemplate } from "../selection/actions";
import { ReduxLogicDoneCb, ReduxLogicNextCb, ReduxLogicProcessDependencies } from "../types";
import { batchActions } from "../util";
import { updateTemplateDraft } from "./actions";
import { GET_TEMPLATE } from "./constants";
import { Annotation } from "./types";

const getTemplateLogic = createLogic({
    process: async ({action, getState, mmsClient}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const { templateId, editTemplate } = action.payload;
        if (templateId) {
            try {
                dispatch(addRequestToInProgress(AsyncRequest.GET_TEMPLATE));
                const template = await mmsClient.getTemplate(templateId);
                const { annotations, ...etc } = template;
                if (editTemplate) {
                    dispatch(batchActions([
                        updateTemplateDraft({
                            ...etc,
                            annotations: annotations.map((a: Annotation, index: number) => ({
                                annotationId: a.annotationId,
                                canHaveMany: a.canHaveMany,
                                description: a.description,
                                index,
                                name: a.name,
                                required: a.required,
                                type: {
                                    annotationOptions: a.annotationOptions,
                                    annotationTypeId: a.annotationTypeId,
                                    lookupColumn: a.lookupColumn,
                                    lookupSchema: a.lookupSchema,
                                    lookupTable: a.lookupTable,
                                    name: a.name,
                                },
                            })),
                        }),
                        removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
                    ]));
                } else {
                    dispatch(batchActions([
                        selectTemplate(template),
                        removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
                    ]));
                }
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
