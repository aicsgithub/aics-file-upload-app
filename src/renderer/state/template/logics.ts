import { get, includes } from "lodash";
import { createLogic } from "redux-logic";

import { getSetAppliedTemplateAction } from "../../util";
import { SaveTemplateRequest } from "../../util/mms-client/types";
import {
  addRequestToInProgress,
  closeModal,
  removeRequestFromInProgress,
  setAlert,
  setErrorAlert,
  setSuccessAlert,
} from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { requestTemplates } from "../metadata/actions";
import {
  getAnnotationLookups,
  getAnnotationTypes,
  getLookupAnnotationTypeId,
  getLookups,
} from "../metadata/selectors";
import { updateSettings } from "../setting/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { getCanSaveUploadDraft } from "../upload/selectors";
import { batchActions } from "../util";

import { updateTemplateDraft } from "./actions";
import { ADD_ANNOTATION, REMOVE_ANNOTATIONS, SAVE_TEMPLATE } from "./constants";
import {
  getSaveTemplateRequest,
  getTemplateDraft,
  getWarnAboutTemplateVersionMessage,
} from "./selectors";
import { AnnotationDraft, SaveTemplateAction } from "./types";

const addExistingAnnotationLogic = createLogic({
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const state = getState();
    const {
      annotationId,
      annotationOptions,
      annotationTypeId,
      description,
      name,
    } = action.payload;
    const { annotations: oldAnnotations } = getTemplateDraft(state);
    const annotationTypes = getAnnotationTypes(state);
    const annotationType = annotationTypes.find(
      (at) => at.annotationTypeId === annotationTypeId
    );
    const lookupAnnotationTypeId = getLookupAnnotationTypeId(state);

    try {
      if (!annotationType) {
        throw new Error(
          `Annotation "${name}" does not have a valid annotationTypeId: ${annotationTypeId}.
                     Contact Software.`
        );
      }

      let lookupSchema;
      let lookupTable;
      if (lookupAnnotationTypeId === annotationTypeId) {
        const annotationLookups = getAnnotationLookups(state);
        const annotationLookup = annotationLookups.find(
          (al) => al.annotationId === annotationId
        );

        if (!annotationLookup) {
          throw new Error(`Annotation "${name}" does not have a lookup associated with it even though
                     it is a Lookup type. Contact Software.`);
        }

        const lookup = getLookups(state).find(
          (l) => l.lookupId === annotationLookup.lookupId
        );

        if (!lookup) {
          throw new Error(`Annotation "${name}" has an invalid lookup id
                     associated with it: ${annotationLookup.lookupId}. Contact Software.`);
        }

        lookupSchema = lookup.schemaName;
        lookupTable = lookup.tableName;
      }

      const annotations: AnnotationDraft[] = [
        ...oldAnnotations,
        {
          annotationId,
          annotationOptions,
          annotationTypeId,
          annotationTypeName: annotationType.name,
          description,
          index: oldAnnotations.length,
          lookupSchema,
          lookupTable,
          name,
          required: false,
        },
      ];

      next(updateTemplateDraft({ annotations }));
    } catch (e) {
      next(
        setAlert({
          message: e.message,
          type: AlertType.ERROR,
        })
      );
    }
  },
  type: ADD_ANNOTATION,
});

const removeAnnotationsLogic = createLogic({
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const { annotations: oldAnnotations } = getTemplateDraft(getState());
    let annotations = [...oldAnnotations];
    annotations = annotations
      .filter((a) => !includes(action.payload, a.index))
      .map((a: AnnotationDraft, index: number) => ({
        ...a,
        index,
      }));
    next(updateTemplateDraft({ annotations }));
  },
  type: REMOVE_ANNOTATIONS,
});

const saveTemplateLogic = createLogic({
  process: async (
    { getState, mmsClient }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const draft = getTemplateDraft(getState());
    const request: SaveTemplateRequest = getSaveTemplateRequest(getState());

    let createdTemplateId;
    try {
      if (draft.templateId) {
        createdTemplateId = await mmsClient.editTemplate(
          request,
          draft.templateId
        );
      } else {
        createdTemplateId = await mmsClient.createTemplate(request);
      }

      dispatch(
        batchActions([
          closeModal("templateEditor"),
          removeRequestFromInProgress(AsyncRequest.SAVE_TEMPLATE),
          updateSettings({ templateId: createdTemplateId }),
          setSuccessAlert("Template saved successfully!"),
          addRequestToInProgress(AsyncRequest.GET_TEMPLATES),
        ])
      );
    } catch (e) {
      const error = get(e, ["response", "data", "error"], e.message);
      dispatch(
        batchActions([
          setErrorAlert("Could not save template: " + error),
          removeRequestFromInProgress(AsyncRequest.SAVE_TEMPLATE),
        ])
      );
      done();
      return;
    }

    // this need to be dispatched separately because it has logics associated with them
    // todo create util method for this so we dispatch less often
    dispatch(requestTemplates());

    if (getCanSaveUploadDraft(getState())) {
      try {
        const setAppliedTemplateAction = await getSetAppliedTemplateAction(
          createdTemplateId,
          getState,
          mmsClient,
          dispatch
        );
        dispatch(setAppliedTemplateAction);
      } catch (e) {
        dispatch(
          batchActions([
            setErrorAlert(
              "Could not retrieve template and update uploads: " + e.message
            ),
            removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
          ])
        );
      }
    }
    done();
  },
  type: SAVE_TEMPLATE,
  validate: async (
    {
      action,
      dialog,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<SaveTemplateAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const warning: string | undefined = getWarnAboutTemplateVersionMessage(
      getState()
    );
    if (warning) {
      const { response } = await dialog.showMessageBox({
        buttons: ["Cancel", "Continue"],
        defaultId: 1,
        message: `This template has been used for uploading other files. ${warning}. Continuing will submit this update.`,
        type: "warning",
      });
      if (response === 0) {
        reject({ type: "ignore" });
        return;
      } else {
        next(action);
        return;
      }
    }
    next(action);
  },
});

export default [
  addExistingAnnotationLogic,
  removeAnnotationsLogic,
  saveTemplateLogic,
];
