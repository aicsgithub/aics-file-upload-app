import { get, includes, map } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { getWithRetry, pivotAnnotations } from "../../util";
import { SaveTemplateRequest } from "../../util/mms-client/types";

import { addRequestToInProgress, closeModal, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { requestTemplates } from "../metadata/actions";
import {
    getAnnotationLookups,
    getAnnotationTypes,
    getBooleanAnnotationTypeId,
    getLookupAnnotationTypeId,
    getLookups,
} from "../metadata/selectors";
import { updateSettings } from "../setting/actions";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { applyTemplate, updateUpload } from "../upload/actions";
import { getUpload } from "../upload/selectors";
import { UploadMetadata } from "../upload/types";
import { batchActions } from "../util";
import { setAppliedTemplate, updateTemplateDraft } from "./actions";
import { ADD_ANNOTATION, GET_TEMPLATE, REMOVE_ANNOTATIONS, SAVE_TEMPLATE } from "./constants";
import { getSaveTemplateRequest, getTemplateDraft } from "./selectors";
import { AnnotationDraft, Template, TemplateAnnotation } from "./types";

const addExistingAnnotationLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
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
        const annotationType = annotationTypes.find((at) => at.annotationTypeId === annotationTypeId);
        const lookupAnnotationTypeId = getLookupAnnotationTypeId(state);

        try {
            if (!annotationType) {
                throw new Error(
                    `Annotation \"${name}\" does not have a valid annotationTypeId: ${annotationTypeId}.
                     Contact Software.`
                );
            }

            let lookupSchema;
            let lookupTable;
            if (lookupAnnotationTypeId === annotationTypeId) {
                const annotationLookups = getAnnotationLookups(state);
                const annotationLookup = annotationLookups.find((al) => al.annotationId === annotationId);

                if (!annotationLookup ) {
                    throw new Error(`Annotation \"${name}\" does not have a lookup associated with it even though
                     it is a Lookup type. Contact Software.`);
                }

                const lookup = getLookups(state).find((l) => l.lookupId === annotationLookup.lookupId);

                if (!lookup) {
                    throw new Error(`Annotation \"${name}\" has an invalid lookup id
                     associated with it: ${annotationLookup.lookupId}. Contact Software.`);
                }

                lookupSchema = lookup.schemaName;
                lookupTable = lookup.tableName;
            }

            const annotations: AnnotationDraft[] = [...oldAnnotations, {
                annotationId,
                annotationOptions,
                annotationTypeId,
                annotationTypeName: annotationType.name,
                canHaveManyValues: false,
                description,
                index: oldAnnotations.length,
                lookupSchema,
                lookupTable,
                name,
                required: false,
            }];

            next(updateTemplateDraft({annotations}));

        } catch (e) {
            next(setAlert({
                message: e.message,
                type: AlertType.ERROR,
            }));
        }
    },
    type: ADD_ANNOTATION,
});

const getTemplateLogic = createLogic({
    process: async ({action, getState, labkeyClient, logger, mmsClient}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const state = getState();
        const { addAnnotationsToUpload, templateId } = action.payload;
        const uploads = getUpload(state);
        const annotationTypes = getAnnotationTypes(state);
        const booleanAnnotationTypeId = getBooleanAnnotationTypeId(state);

        if (!booleanAnnotationTypeId) {
            dispatch(setAlert({
                message: "Could not get boolean annotation type. Contact Software",
                type: AlertType.ERROR,
            }));
            throw new Error("Could not get boolean annotation type. Contact Software");
        }

        try {
            const template: Template = await getWithRetry(
                () => mmsClient.getTemplate(templateId),
                AsyncRequest.GET_TEMPLATE,
                dispatch,
                "MMS",
                "Could not retrieve template"
            );
            const { annotations, ...etc } = template;
            const actions: AnyAction[] = [];

            if (addAnnotationsToUpload) {
                const additionalAnnotations = pivotAnnotations(annotations, booleanAnnotationTypeId);
                actions.push(
                    setAppliedTemplate({
                        ...etc,
                        annotations,
                    }),
                    ...map(uploads, (metadata: UploadMetadata, key: string) => updateUpload(key,  {
                        ...additionalAnnotations,
                        ...metadata, // prevent existing annotations from getting overwritten
                    }))
                );
            } else {
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
            }
            dispatch(batchActions(actions));
        } catch (e) {
            logger.error("Could not retrieve template", e);
        }

        done();
    },
    type: GET_TEMPLATE,
});

const removeAnnotationsLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const { annotations: oldAnnotations } = getTemplateDraft(getState());
        let annotations = [...oldAnnotations];
        annotations = annotations.filter((a) => !includes(action.payload, a.index))
            .map((a: AnnotationDraft, index: number) => ({
                ...a,
                index,
            }));
        next(updateTemplateDraft({annotations}));
    },
    type: REMOVE_ANNOTATIONS,
});

const saveTemplateLogic = createLogic({
    process: async ({action, getState, mmsClient}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const draft = getTemplateDraft(getState());
        const request: SaveTemplateRequest = getSaveTemplateRequest(getState());
        dispatch(addRequestToInProgress(AsyncRequest.SAVE_TEMPLATE));
        let createdTemplateId;
        try {
            if (draft.templateId) {
                createdTemplateId = await mmsClient.editTemplate(request, draft.templateId);
            } else {
                createdTemplateId = await mmsClient.createTemplate(request);
            }

            // these need to be dispatched separately because they have logics associated with them
            dispatch(closeModal("templateEditor"));
            dispatch(requestTemplates());
            dispatch(applyTemplate(createdTemplateId));
            dispatch(removeRequestFromInProgress(AsyncRequest.SAVE_TEMPLATE));
            dispatch(updateSettings({ templateId: createdTemplateId }));
            dispatch(setAlert({
                message: "Template saved successfully!",
                type: AlertType.SUCCESS,
            }));

        } catch (e) {
            const error = get(e, ["response", "data", "error"], e.message);
            dispatch(batchActions([
                setAlert({
                    message: "Could not save template: " + error,
                    type: AlertType.ERROR,
                }),
                removeRequestFromInProgress(AsyncRequest.SAVE_TEMPLATE),
            ]));
        }
        done();
    },
    type: SAVE_TEMPLATE,
});

export default [
    addExistingAnnotationLogic,
    getTemplateLogic,
    removeAnnotationsLogic,
    saveTemplateLogic,
];
