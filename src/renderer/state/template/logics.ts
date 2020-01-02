import { includes, isEmpty, map } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { pivotAnnotations } from "../../util";

import LabkeyClient from "../../util/labkey-client";

import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { requestTemplates } from "../metadata/actions";
import {
    getAnnotationLookups,
    getAnnotationTypes,
    getBooleanAnnotationTypeId,
    getLookupAnnotationTypeId,
    getLookups,
} from "../metadata/selectors";
import { closeTemplateEditor } from "../selection/actions";
import { addTemplateIdToSettings } from "../setting/actions";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
    State,
} from "../types";
import { updateUpload } from "../upload/actions";
import { getUpload } from "../upload/selectors";
import { UploadMetadata } from "../upload/types";
import { batchActions } from "../util";
import { setAppliedTemplate, updateTemplateDraft } from "./actions";
import { ADD_ANNOTATION, GET_TEMPLATE, REMOVE_ANNOTATIONS, SAVE_TEMPLATE } from "./constants";
import { getSaveTemplateRequest, getTemplateDraft } from "./selectors";
import { AnnotationDraft, SaveTemplateRequest, Template, TemplateAnnotation } from "./types";

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

const getAnnotationOptions = async ({annotationId, annotationOptions, annotationTypeId}: TemplateAnnotation,
                                    state: State, labkeyClient: LabkeyClient): Promise<string[] | undefined> => {
    console.log('inside getAnnotationOptions');
    if (!isEmpty(annotationOptions)) {
        return annotationOptions;
    }

    console.log('before first thing');
    const lookupAnnotationTypeId = getLookupAnnotationTypeId(state);
    console.log('lookup type id', lookupAnnotationTypeId);
    if (annotationTypeId === lookupAnnotationTypeId) {
        console.log('in if');
        const annotationLookup = getAnnotationLookups(state).find((al) => al.annotationId === annotationId);

        if (!annotationLookup) {
            console.log('annotation LOOKUP ERROR');
            throw new Error("Could not retrieve lookup values");
        }

        const lookup = getLookups(state).find((l) => l.lookupId === annotationLookup.lookupId);

        if (!lookup) {
            console.log('LOOKUP ERROR');
            throw new Error("Could not retrieve lookup values");
        }

        const { columnName, schemaName, tableName } = lookup;
        // return Promise.resolve([]);
        const asdfasdfasdf =  await labkeyClient.getColumnValues(schemaName, tableName, columnName);
        console.log('at end', asdfasdfasdf);
        return asdfasdfasdf;
    }
    console.log('undefined');
    return undefined;
};

const getTemplateLogic = createLogic({
    process: async ({action, getState, labkeyClient, mmsClient}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        console.log('getTemplateLogic');
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
            console.log('added GET_TEMPLATE to in progress');
            dispatch(addRequestToInProgress(AsyncRequest.GET_TEMPLATE));
            const template: Template = await mmsClient.getTemplate(templateId);
            const { annotations, ...etc } = template;
            const actions: AnyAction[] = [removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE)];

            if (addAnnotationsToUpload) {
                const additionalAnnotations = pivotAnnotations(annotations, booleanAnnotationTypeId);
                console.log('pushing stuff onto actions now?');
                actions.push(
                    setAppliedTemplate({
                        ...etc,
                        annotations: await Promise.all(annotations.map(async (a: TemplateAnnotation, index: number) => {
                            console.log('in map', a, annotations, index, annotations.length);
                            return {
                            ...a,
                            annotationOptions: await getAnnotationOptions(a, getState(), labkeyClient),
                        }})),
                    }),
                    ...map(uploads, (metadata: UploadMetadata, key: string) => {
                        console.log('in second map', key, metadata);
                        return updateUpload(key,  {
                        ...metadata,
                        ...additionalAnnotations,
                    })})
                );
            } else {
                actions.push(updateTemplateDraft({
                    ...etc,
                    annotations: annotations.map((a: TemplateAnnotation, index: number) => {
                        const type = annotationTypes.find((t) => t.annotationTypeId === a.annotationTypeId);
                        console.log('in map?');
                        if (!type) {
                            console.log('ERROR INSIDE OF map?');
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
            console.log('BATCHED GET_TEMPLATE REQUEST', actions);
            dispatch(batchActions(actions));
        } catch (e) {
            console.log('ERROR CAUGHT', e);
            dispatch(batchActions([
                removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
                setAlert({
                    message: "Could not retrieve template: " + e.message,
                    type: AlertType.ERROR,
                }),
            ]));
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
            dispatch(closeTemplateEditor());
            dispatch(requestTemplates());
            dispatch(removeRequestFromInProgress(AsyncRequest.SAVE_TEMPLATE));
            dispatch(addTemplateIdToSettings(createdTemplateId));
            dispatch(setAlert({
                message: "Template saved successfully!",
                type: AlertType.SUCCESS,
            }));

        } catch (e) {
            dispatch(batchActions([
                setAlert({
                    message: "Could not save template: " + e.message,
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
