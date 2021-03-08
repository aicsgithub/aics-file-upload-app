import { get, includes } from "lodash";
import { createLogic } from "redux-logic";

import { SaveTemplateRequest } from "../../services/mms-client/types";
import { getApplyTemplateInfo } from "../../util";
import { requestFailed } from "../actions";
import { setAlert } from "../feedback/actions";
import { requestTemplates } from "../metadata/actions";
import {
  getAnnotationLookups,
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getLookupAnnotationTypeId,
  getLookups,
} from "../metadata/selectors";
import {
  AlertType,
  AnnotationDraft,
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { getCanSaveUploadDraft, getUpload } from "../upload/selectors";

import {
  saveTemplateSucceeded,
  setAppliedTemplate,
  updateTemplateDraft,
} from "./actions";
import {
  ADD_ANNOTATION,
  ADD_EXISTING_TEMPLATE,
  REMOVE_ANNOTATIONS,
  SAVE_TEMPLATE,
} from "./constants";
import {
  getAppliedTemplate,
  getSaveTemplateRequest,
  getTemplateDraft,
  getTemplateDraftAnnotations,
  getWarnAboutTemplateVersionMessage,
} from "./selectors";
import { SaveTemplateAction } from "./types";
import { ApplyTemplateAction } from "../upload/types";

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
    // todo create util method for this so we dispatch less often
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

const applyExistingTemplateAnnotationsLogic = createLogic({
  transform: async (
    {
      action,
      getState,
      mmsClient,
    }: ReduxLogicTransformDependenciesWithAction<ApplyTemplateAction>,
    next: ReduxLogicNextCb
  ) => {
    const state = getState();
    const templateId = action.payload;
    const annotationTypes = getAnnotationTypes(state);
    const currentAnnotations = getTemplateDraftAnnotations(state);

    try {
      const { annotations: newAnnotations } = await mmsClient.getTemplate(
        templateId
      );
      const newAnnotationDrafts = newAnnotations.map((annotation, index) => {
        const annotationType = annotationTypes.find(
          (at) => at.annotationTypeId === annotation.annotationTypeId
        );

        const {
          annotationId,
          annotationOptions,
          annotationTypeId,
          description,
          lookupSchema,
          lookupTable,
          name,
        } = annotation;

        if (!annotationType) {
          throw new Error(
            `Annotation "${name}" does not have a valid annotationTypeId: ${annotationTypeId}.
                     Contact Software.`
          );
        }

        return {
          annotationId,
          annotationOptions,
          annotationTypeId,
          annotationTypeName: annotationType.name,
          description,
          index: currentAnnotations.length + index,
          lookupSchema,
          lookupTable,
          name,
          required: false,
        };
      });
      const annotations: AnnotationDraft[] = [
        ...currentAnnotations,
        ...newAnnotationDrafts,
      ];
      next(updateTemplateDraft({ annotations }));
    } catch (e) {
      next(
        requestFailed(
          `Could not add annotations from template: ${get(
            e,
            ["response", "data", "error"],
            e.message
          )}`,
          AsyncRequest.GET_TEMPLATE
        )
      );
    }
  },
  type: ADD_EXISTING_TEMPLATE,
});

export default [
  addExistingAnnotationLogic,
  removeAnnotationsLogic,
  saveTemplateLogic,
  applyExistingTemplateAnnotationsLogic,
];
