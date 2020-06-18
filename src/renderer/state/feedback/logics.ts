import { createLogic } from "redux-logic";

import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { getWithRetry } from "../../util";
import { getAnnotationTypes } from "../metadata/selectors";
import {
  startTemplateDraft,
  startTemplateDraftFailed,
} from "../template/actions";
import { TemplateAnnotation } from "../template/types";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
} from "../types";

import { clearDeferredAction } from "./actions";
import { CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";
import { AsyncRequest, OpenTemplateEditorAction } from "./types";

const openTemplateEditorLogic = createLogic({
  process: async (
    {
      action,
      getState,
      labkeyClient,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<OpenTemplateEditorAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const templateId = action.payload;
    if (typeof templateId === "number") {
      const annotationTypes = getAnnotationTypes(getState());
      try {
        const [template, hasBeenUsed] = await getWithRetry(
          () =>
            Promise.all([
              mmsClient.getTemplate(templateId),
              labkeyClient.getTemplateHasBeenUsed(templateId),
            ]),
          AsyncRequest.GET_TEMPLATE,
          dispatch,
          "MMS",
          "Could not retrieve template"
        );
        const { annotations, ...etc } = template;
        dispatch(
          startTemplateDraft(
            template,
            {
              ...etc,
              annotations: annotations.map(
                (a: TemplateAnnotation, index: number) => {
                  const type = annotationTypes.find(
                    (t) => t.annotationTypeId === a.annotationTypeId
                  );
                  if (!type) {
                    throw new Error(`Could not find matching type for annotation named ${a.name},
                       annotationTypeId: ${a.annotationTypeId}`);
                  }
                  return {
                    ...a,
                    annotationTypeName: type.name,
                    index,
                  };
                }
              ),
            },
            !!hasBeenUsed
          )
        );
      } catch (e) {
        const error: string | undefined = e?.response?.data?.error || e.message;
        dispatch(
          startTemplateDraftFailed("Could not retrieve template: " + error)
        );
      }
    }
    done();
  },
  type: OPEN_TEMPLATE_MENU_ITEM_CLICKED,
});

const closeModalLogic = createLogic({
  process: (
    { getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const deferredAction = getDeferredAction(getState());
    if (deferredAction) {
      dispatch(deferredAction);
    }
    dispatch(clearDeferredAction());
    done();
  },
  type: CLOSE_MODAL,
});

export default [closeModalLogic, openTemplateEditorLogic];
