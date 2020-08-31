import { createLogic } from "redux-logic";

import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { TemplateAnnotation } from "../../services/mms-client/types";
import { getAnnotationTypes } from "../metadata/selectors";
import {
  clearTemplateDraft,
  startTemplateDraft,
  startTemplateDraftFailed,
} from "../template/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
} from "../types";

import { clearDeferredAction } from "./actions";
import { CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";
import { OpenTemplateEditorAction } from "./types";
import { getWithRetry } from "./util";

const openTemplateEditorLogic = createLogic({
  process: async (
    {
      action,
      getState,
      httpClient,
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
              mmsClient.getTemplate(httpClient, templateId),
              labkeyClient.getTemplateHasBeenUsed(templateId),
            ]),
          dispatch
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
            hasBeenUsed
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
    { action, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const deferredAction = getDeferredAction(getState());
    if (deferredAction) {
      dispatch(deferredAction);
    }
    dispatch(clearDeferredAction());
    if (action.payload === "templateEditor") {
      // Clear template draft any time the draft editor is closed
      dispatch(clearTemplateDraft());
    }
    done();
  },
  type: CLOSE_MODAL,
});

export default [closeModalLogic, openTemplateEditorLogic];
