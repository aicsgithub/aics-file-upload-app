import { get, includes, isNil } from "lodash";
import { createLogic } from "redux-logic";

import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import {
  SaveTemplateRequest,
  TemplateAnnotation,
} from "../../services/mms-client/types";
import { requestFailed } from "../actions";
import { setAlert } from "../feedback/actions";
import { OpenTemplateEditorAction } from "../feedback/types";
import { receiveMetadata, requestTemplates } from "../metadata/actions";
import {
  getAnnotationLookups,
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getLookupAnnotationTypeId,
  getLookups,
} from "../metadata/selectors";
import { getApplyTemplateInfo, getWithRetry } from "../stateHelpers";
import {
  AlertType,
  AnnotationDraft,
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { getCanSaveUploadDraft, getUpload } from "../upload/selectors";
import { ApplyTemplateAction } from "../upload/types";

import {
  addExistingAnnotation,
  removeAnnotations,
  saveTemplateSucceeded,
  setAppliedTemplate,
  startTemplateDraft,
  startTemplateDraftFailed,
  updateTemplateDraft,
} from "./actions";
import {
  ADD_ANNOTATION,
  ADD_EXISTING_TEMPLATE,
  CREATE_ANNOTATION,
  EDIT_ANNOTATION,
  REMOVE_ANNOTATIONS,
  SAVE_TEMPLATE,
} from "./constants";
import {
  getAppliedTemplate,
  getSaveTemplateRequest,
  getTemplateDraft,
} from "./selectors";
import { CreateAnnotationAction, EditAnnotationAction } from "./types";

const createAnnotation = createLogic({
  process: async (
    {
      action,
      labkeyClient,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<CreateAnnotationAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      // Create the new annotation via MMS
      const annotationRequest = action.payload;
      const annotation = await mmsClient.createAnnotation(annotationRequest);

      // Refresh our store of annotation information
      const request = () =>
        Promise.all([
          labkeyClient.getAnnotations(),
          labkeyClient.getAnnotationOptions(),
          labkeyClient.getAnnotationLookups(),
        ]);
      const [
        annotations,
        annotationOptions,
        annotationLookups,
      ] = await getWithRetry(request, dispatch);
      dispatch(
        receiveMetadata(
          { annotationOptions, annotations, annotationLookups },
          AsyncRequest.CREATE_ANNOTATION
        )
      );

      // Add newly created annotation to the template
      dispatch(addExistingAnnotation(annotation));
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not create annotation: ${e.message}`,
          AsyncRequest.CREATE_ANNOTATION
        )
      );
    }
    done();
  },
  type: CREATE_ANNOTATION,
});

const editAnnotation = createLogic({
  process: async (
    {
      action,
      mmsClient,
      labkeyClient,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<EditAnnotationAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      // Create the new annotation via MMS
      const annotation = await mmsClient.editAnnotation(
        action.payload.annotationId,
        action.payload.metadata
      );

      // Refresh our store of annotation information
      const request = () =>
        Promise.all([
          labkeyClient.getAnnotations(),
          labkeyClient.getAnnotationOptions(),
          labkeyClient.getAnnotationLookups(),
        ]);
      const [
        annotations,
        annotationOptions,
        annotationLookups,
      ] = await getWithRetry(request, dispatch);
      dispatch(
        receiveMetadata(
          { annotationOptions, annotations, annotationLookups },
          AsyncRequest.EDIT_ANNOTATION
        )
      );

      // Replace old annotation version with new one
      const oldAnnotationIndex = getTemplateDraft(getState()).annotations.find(
        (a) => a.annotationId === action.payload.annotationId
      )?.index;
      if (oldAnnotationIndex !== undefined) {
        dispatch(removeAnnotations([oldAnnotationIndex]));
      }
      dispatch(addExistingAnnotation(annotation));
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not edit annotation: ${e.message}`,
          AsyncRequest.EDIT_ANNOTATION
        )
      );
    }
    done();
  },
  type: EDIT_ANNOTATION,
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
    if (!isNil(templateId)) {
      const annotationTypes = getAnnotationTypes(getState());
      try {
        const [template] = await getWithRetry(
          () => Promise.all([mmsClient.getTemplate(templateId)]),
          dispatch
        );
        const { annotations, ...etc } = template;
        dispatch(
          startTemplateDraft(template, {
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
          })
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

const addExistingAnnotationLogic = createLogic({
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const state = getState();
    const { annotationId, annotationTypeId, name } = action.payload;
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
          annotationTypeName: annotationType.name,
          index: oldAnnotations.length,
          lookupSchema,
          lookupTable,
          name,
          required: false,
          ...action.payload,
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
    const { annotations: currentAnnotations } = getTemplateDraft(state);

    try {
      const { annotations: newAnnotations } = await mmsClient.getTemplate(
        templateId
      );
      const annotationsToKeep = currentAnnotations.filter(
        (a) =>
          !newAnnotations.find(
            (newAnnotation) => a.annotationId === newAnnotation.annotationId
          )
      );
      const newAnnotationDrafts = newAnnotations.map((annotation, index) => {
        const annotationType = annotationTypes.find(
          (at) => at.annotationTypeId === annotation.annotationTypeId
        );

        if (!annotationType) {
          const { annotationTypeId, name } = annotation;
          throw new Error(
            `Annotation "${name}" does not have a valid annotationTypeId: ${annotationTypeId}.
                     Contact Software.`
          );
        }

        return {
          ...annotation,
          annotationTypeName: annotationType.name,
          index: annotationsToKeep.length + index,
        };
      });
      const annotations: AnnotationDraft[] = [
        ...annotationsToKeep,
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
  createAnnotation,
  editAnnotation,
  addExistingAnnotationLogic,
  removeAnnotationsLogic,
  saveTemplateLogic,
  applyExistingTemplateAnnotationsLogic,
  openTemplateEditorLogic,
];
