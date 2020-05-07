import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { createMockReduxStore, mmsClient } from "../../test/configure-mock-store";
import {
    getMockStateWithHistory,
    mockAnnotationDraft,
    mockAnnotationTypes,
    mockFavoriteColorAnnotation,
    mockLookups,
    mockState,
} from "../../test/mocks";

import { addExistingAnnotation, removeAnnotations, saveTemplate } from "../actions";
import { getTemplateDraftAnnotations } from "../selectors";
import { ColumnType } from "../types";

describe("Template Logics", () => {
    const sandbox = createSandbox();

    afterEach(() => {
        sandbox.restore();
    });

    const startState = {
        ...mockState,
        metadata: {
            ...mockState.metadata,
            annotationLookups: [{annotationId: mockFavoriteColorAnnotation.annotationId, lookupId: 1}],
            annotationTypes: mockAnnotationTypes,
            lookups: mockLookups,
        },
    };

    describe("addExistingAnnotationLogic", () => {

        it("adds annotation to draft annotations", () => {
            const { store } = createMockReduxStore({...startState});

            let state = store.getState();
            expect(getTemplateDraftAnnotations(state).length).to.equal(0);

            store.dispatch(addExistingAnnotation({
                ...mockFavoriteColorAnnotation,
                annotationTypeId: 3,
            }));

            state = store.getState();
            expect(getTemplateDraftAnnotations(state).length).to.equal(1);
        });
        it("sets alert if the annotation type is not recognized", () => {
            const { store } = createMockReduxStore({...startState});

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(addExistingAnnotation({
                ...mockFavoriteColorAnnotation,
                annotationTypeId: 100,
            }));

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
        it("sets alert if the annotation type is lookup and no annotationlookup junction exists", () => {
            const { store } = createMockReduxStore({
                ...startState,
                metadata: {
                    ...startState.metadata,
                    annotationLookups: [],
                },
            });

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(addExistingAnnotation({
                ...mockFavoriteColorAnnotation,
                annotationTypeId: 6,
            }));

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
        it("sets alert if lookup id is invalid", () => {
            const { store } = createMockReduxStore({
                ...startState,
                metadata: {
                    ...startState.metadata,
                    lookups: [],
                },
            });

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(addExistingAnnotation({
                ...mockFavoriteColorAnnotation,
                annotationTypeId: 6,
            }));

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
    });

    describe("removeAnnotationsLogic", () => {
        it("removes annotations from template draft", () => {
            const { store } = createMockReduxStore({
                ...startState,
                template: getMockStateWithHistory({
                    ...startState.template.present,
                    draft: {
                        annotations: [
                            {
                                annotationId: 1,
                                annotationTypeId: 1,
                                annotationTypeName: ColumnType.TEXT,
                                index: 0,
                                required: false,
                            },
                            {
                                annotationId: 2,
                                annotationTypeId: 1,
                                annotationTypeName: ColumnType.TEXT,
                                index: 1,
                                required: false,
                            },
                            {
                                annotationId: 3,
                                annotationTypeId: 1,
                                annotationTypeName: ColumnType.TEXT,
                                index: 2,
                                required: false,
                            },
                        ],
                        name: "My template",
                    },
                }),
            });

            store.dispatch(removeAnnotations([0, 2]));
            expect(getTemplateDraftAnnotations(store.getState()).length).to.equal(1);
        });
    });

    describe("saveTemplateLogic", () => {
        it("calls editTemplate endpoint if template id supplied", async () => {
            const editTemplateStub = stub().resolves([1]);
            sandbox.replace(mmsClient, "editTemplate", editTemplateStub);
            const { logicMiddleware, store } = createMockReduxStore({
                ...startState,
                template: getMockStateWithHistory({
                    ...startState.template.present,
                    draft: {
                        annotations: [mockAnnotationDraft],
                        name: "My Template",
                        templateId: 1,
                    },
                }),
            });

            expect(editTemplateStub.called).to.be.false;
            store.dispatch(saveTemplate());

            await logicMiddleware.whenComplete();
            expect(editTemplateStub.called).to.be.true;
        });
        it("calls createTemplate endpoint if template id not supplied", async () => {
            const createTemplateStub = stub().resolves([1]);
            sandbox.replace(mmsClient, "createTemplate", createTemplateStub);
            const { logicMiddleware, store } = createMockReduxStore({
                ...startState,
                template: getMockStateWithHistory({
                    ...startState.template.present,
                    draft: {
                        annotations: [mockAnnotationDraft],
                        name: "My Template",
                    },
                }),
            });

            expect(createTemplateStub.called).to.be.false;
            store.dispatch(saveTemplate());

            await logicMiddleware.whenComplete();
            expect(createTemplateStub.called).to.be.true;
        });
        it("sets alert if endpoint returns not OK response", async () => {
            const error = "Bad credentials";
            const editTemplateStub = stub().rejects({
                response: {
                    data: {
                        error,
                    },
                },
            });
            sandbox.replace(mmsClient, "editTemplate", editTemplateStub);
            const { logicMiddleware, store } = createMockReduxStore({
                ...startState,
                template: getMockStateWithHistory({
                    ...startState.template.present,
                    draft: {
                        annotations: [mockAnnotationDraft],
                        name: "My Template",
                        templateId: 1,
                    },
                }),
            });

            expect(getAlert(store.getState())).to.be.undefined;
            store.dispatch(saveTemplate());

            await logicMiddleware.whenComplete();
            const alert = getAlert(store.getState());
            expect(alert).to.not.be.undefined;
            if (alert) {
                expect(alert.message).to.equal(`Could not save template: ${error}`);
            }
        });
    });
});
