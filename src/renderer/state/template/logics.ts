import { get } from "lodash";
import { createLogic } from "redux-logic";

import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { TemplateAnnotation } from "../../services/mms-client/types";
import { getApplyTemplateInfo } from "../../util";
import { requestFailed } from "../actions";
import { OpenTemplateEditorAction } from "../feedback/types";
import { getWithRetry } from "../feedback/util";
import { requestAnnotations, requestTemplates } from "../metadata/actions";
import {
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
} from "../metadata/selectors";
import {
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
} from "../types";
import { getCanSaveUploadDraft, getUpload } from "../upload/selectors";

import { startEditingTemplate } from "./actions";
import { saveTemplateSucceeded, setAppliedTemplate } from "./actions";
import { CREATE_ANNOTATION, CREATE_ANNOTATION_OPTIONS, SAVE_TEMPLATE } from "./constants";
import { getAppliedTemplate } from "./selectors";
import { CreateAnnotationAction, CreateAnnotationOptionsAction } from "./types";

const createAnnotation = createLogic({
  process: async (
    {
      action,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<CreateAnnotationAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const annotationRequest = action.payload;
    mmsClient.createAnnotation(annotationRequest);
    dispatch(requestAnnotations());
    // TODO: Add annotation to template
    done();
  },
  type: CREATE_ANNOTATION,
});

const createAnnotationOptions = createLogic({
  process: async (
    {
      action,
    }: ReduxLogicProcessDependenciesWithAction<CreateAnnotationOptionsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { annotationId, newDropdownOptions } = action.payload;
    // TODO: Update template
    done();
  },
  type: CREATE_ANNOTATION_OPTIONS,
});

const openTemplateEditorLogic = createLogic({
  process: async (
    {
      action,
      getState,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<OpenTemplateEditorAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const templateId = action.payload;
    if (typeof templateId === "number") {
      const annotationTypes = getAnnotationTypes(getState());
      try {
        const [template] = await getWithRetry(
          () => Promise.all([mmsClient.getTemplate(templateId)]),
          dispatch
        );
        dispatch(
          startEditingTemplate({
            ...template,
            annotations: template.annotations.map(
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
          })
        );
      } catch (e) {
        const error: string | undefined = e?.response?.data?.error || e.message;
        dispatch(
          requestFailed(
            "Could not get template to edit: " + error,
            AsyncRequest.GET_TEMPLATE
          )
        );
      }
    }
    done();
  },
  type: OPEN_TEMPLATE_MENU_ITEM_CLICKED,
});

const saveTemplateLogic = createLogic({
  process: async (
    { action, getState, mmsClient }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { templateId, name, annotations } = action.payload;

    let createdTemplateId;
    try {
      const request = { name, annotations };
      if (templateId) {
        createdTemplateId = await mmsClient.editTemplate(request, templateId);
      } else {
        createdTemplateId = await mmsClient.createTemplate(request);
      }

      dispatch(saveTemplateSucceeded(createdTemplateId));
    } catch (e) {
      const error = get(e, ["response", "data", "error"], e.message);
      dispatch(
        requestFailed(
          "Could not save template: " + error,
          AsyncRequest.SAVE_TEMPLATE
        )
      );
      done();
      return;
    }

    // this need to be dispatched separately because it has logics associated with them
    dispatch(requestTemplates());

    if (getCanSaveUploadDraft(getState())) {
      const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
      if (!booleanAnnotationTypeId) {
        dispatch(
          requestFailed(
            "Could not get boolean annotation type id. Contact Software",
            AsyncRequest.SAVE_TEMPLATE
          )
        );
        done();
        return;
      }

      try {
        const { template, uploads } = await getApplyTemplateInfo(
          createdTemplateId,
          mmsClient,
          dispatch,
          booleanAnnotationTypeId,
          getUpload(getState()),
          getAppliedTemplate(getState())
        );
        dispatch(setAppliedTemplate(template, uploads));
      } catch (e) {
        const error = `Could not retrieve template and update uploads: ${get(
          e,
          ["response", "data", "error"],
          e.message
        )}`;
        dispatch(requestFailed(error, AsyncRequest.GET_TEMPLATE));
      }
    }
    done();
  },
  type: SAVE_TEMPLATE,
});

export default [createAnnotation, createAnnotationOptions, openTemplateEditorLogic, saveTemplateLogic];
