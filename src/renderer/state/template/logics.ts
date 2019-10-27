import { isEmpty, map } from "lodash";
import { createLogic } from "redux-logic";

import LabkeyClient from "../../util/labkey-client";

import { addRequestToInProgress, removeRequestFromInProgress, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import {
    getAnnotationLookups,
    getAnnotationTypes, getBooleanAnnotationTypeId,
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
import { UpdateUploadAction, UploadMetadata } from "../upload/types";
import { batchActions } from "../util";
import { updateTemplateDraft } from "./actions";
import { ADD_ANNOTATION, GET_TEMPLATE, REMOVE_ANNOTATIONS, SAVE_TEMPLATE } from "./constants";
import { getTemplateDraft } from "./selectors";
import {
    AnnotationDraft,
    ColumnType, CreateAnnotationRequest,
    SaveTemplateRequest,
    Template,
    TemplateAnnotation,
} from "./types";

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

        } catch(e) {
            next(setAlert({
                message: e.message,
                type: AlertType.ERROR,
            }));
        }
    },
    type: ADD_ANNOTATION,
});

const getAnnotationOptions = async ({annotationId, annotationOptions, annotationTypeId}: TemplateAnnotation,
                                    state: State, labkeyClient: LabkeyClient) => {
    if (!isEmpty(annotationOptions)) {
        return annotationOptions;
    }

    const lookupAnnotationTypeId = getLookupAnnotationTypeId(state);
    if (annotationTypeId === lookupAnnotationTypeId) {
        const annotationLookup = getAnnotationLookups(state).find((al) => al.annotationId === annotationId);

        if (!annotationLookup) {
            throw new Error("Could not retrieve lookup values"); // todo message
        }

        const lookup = getLookups(state).find((l) => l.lookupId === annotationLookup.lookupId);

        if (!lookup) {
            throw new Error("Could not retrieve lookup values"); // todo message
        }

        const { columnName, schemaName, tableName } = lookup;
        return await labkeyClient.getColumnValues(schemaName, tableName, columnName);
    }

    return undefined;
};

// this is called when editing an existing template and when applying a template to an upload
const getTemplateLogic = createLogic({
    process: async ({action, getState, labkeyClient, mmsClient}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb,
                    done: ReduxLogicDoneCb) => {
        const state = getState();
        const { addAnnotationsToUpload, templateId } = action.payload;
        const uploads = getUpload(state);
        const annotationTypes = getAnnotationTypes(state);
        const booleanAnnotationTypeId = getBooleanAnnotationTypeId(state);

        try {
            dispatch(addRequestToInProgress(AsyncRequest.GET_TEMPLATE));
            const template: Template = await mmsClient.getTemplate(templateId);
            const { annotations, ...etc } = template;

            const additionalAnnotations = annotations.reduce((accum: any, a: TemplateAnnotation) => {
                let value;
                if (a.annotationTypeId === booleanAnnotationTypeId) {
                    value = false;
                } else if (a.canHaveManyValues) {
                    value = [];
                }
                return {
                    ...accum,
                    [a.name]: value,
                };
            }, {});

            const updates: UpdateUploadAction[] = addAnnotationsToUpload ?
                map(uploads, (metadata: UploadMetadata, key: string) => updateUpload(key,  {
                    ...metadata,
                    ...additionalAnnotations,
                })) : [];
            dispatch(batchActions([
                updateTemplateDraft({
                    ...etc,
                    annotations: await Promise.all(annotations.map(async (a: TemplateAnnotation, index: number) => {
                        const type = annotationTypes.find((t) => t.annotationTypeId === a.annotationTypeId);
                        if (!type) {
                            throw new Error(`Could not find matching type for annotation named ${a.name},
                             annotationTypeId: ${a.annotationTypeId}`);
                        }
                        return {
                            ...a,
                            annotationOptions: await getAnnotationOptions(a, getState(), labkeyClient),
                            annotationTypeName: type.name,
                            index,
                        };
                    })),
                }),
                removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
                ...updates,
            ]));
        } catch (e) {
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
        action.payload.forEach((selectedRow: number) => {
            annotations.splice(selectedRow, 1);
        });
        annotations = annotations.map((a: AnnotationDraft, index: number) => ({
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
        const request: SaveTemplateRequest = {
            ...draft,
            annotations: draft.annotations.map((a: AnnotationDraft) => {
                if (a.annotationId) {
                    return {annotationId: a.annotationId};
                }

                let annotationOptions = a.annotationOptions;
                if (a.annotationTypeName === ColumnType.LOOKUP) {
                    annotationOptions = undefined;
                }

                const b: CreateAnnotationRequest = {
                    annotationOptions,
                    annotationTypeId: a.annotationTypeId,
                    canHaveManyValues: a.canHaveManyValues,
                    description: a.description || "",
                    lookupSchema: a.lookupSchema,
                    lookupTable: a.lookupTable,
                    name: a.name || "",
                    required: a.required,
                };
                return b;
            }),
            name: draft.name || "",
        };
        dispatch(addRequestToInProgress(AsyncRequest.SAVE_TEMPLATE));
        let createdTemplateId;
        try {
            if (draft.templateId) {
                createdTemplateId = await mmsClient.editTemplate(request);
            } else {
                createdTemplateId = await mmsClient.createTemplate(request);

            }

            dispatch(closeTemplateEditor());
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
