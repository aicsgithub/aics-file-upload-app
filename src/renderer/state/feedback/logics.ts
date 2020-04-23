import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";
import { getWithRetry } from "../../util";
import { getAnnotationTypes } from "../metadata/selectors";
import { updateTemplateDraft } from "../template/actions";
import { Template, TemplateAnnotation } from "../template/types";

import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
} from "../types";
import { batchActions } from "../util";

import { clearDeferredAction, removeRequestFromInProgress, setErrorAlert } from "./actions";
import { CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";
import { AsyncRequest } from "./types";

const openTemplateEditorLogic = createLogic({
    process: async ({action, getState, mmsClient}: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const annotationTypes = getAnnotationTypes(getState());
        const actions: AnyAction[] = [removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE)];
        try {
            const template: Template = await getWithRetry(
                () => mmsClient.getTemplate(action.payload),
                AsyncRequest.GET_TEMPLATE,
                dispatch,
                "MMS",
                "Could not retrieve template"
            );
            const { annotations, ...etc } = template;
            actions.push(updateTemplateDraft({
                ...etc,
                annotations: annotations.map((a: TemplateAnnotation, index: number) => {
                    const type = annotationTypes.find((t) => t.annotationTypeId === a.annotationTypeId);
                    if (!type) {
                        throw new Error(`Could not find matching type for annotation named ${a.name},
                         annotationTypeId: ${a.annotationTypeId}`);
                    }
                    return {
                        ...a,
                        annotationTypeName: type.name,
                        index,
                    };
                }),
            }));
        } catch (e) {
            actions.push(setErrorAlert("Could not retrieve template"));
        }

        dispatch(batchActions(actions));
        done();
    },
    type: OPEN_TEMPLATE_EDITOR,
});

const closeModalLogic = createLogic({
    process: ({ getState }: ReduxLogicProcessDependencies, dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const deferredAction = getDeferredAction(getState());
        if (deferredAction) {
            dispatch(deferredAction);
        }
        dispatch(clearDeferredAction());
        done();
    },
    type: CLOSE_MODAL,
});

export default [
    closeModalLogic,
    openTemplateEditorLogic,
];
