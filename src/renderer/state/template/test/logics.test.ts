import { expect } from "chai";
import { createSandbox, stub } from "sinon";

import { getAlert } from "../../feedback/selectors";
import { createMockReduxStore, labkeyClient, mmsClient } from "../../test/configure-mock-store";
import {
    getMockStateWithHistory,
    mockAnnotation, mockAnnotationDraft,
    mockAnnotationTypes,
    mockLookups,
    mockMMSTemplate,
    mockState,
} from "../../test/mocks";
import { getUpload } from "../../upload/selectors";

import { addExistingAnnotation, getTemplate, removeAnnotations, saveTemplate } from "../actions";
import { DEFAULT_TEMPLATE_DRAFT } from "../constants";
import { getAppliedTemplate, getTemplateDraft, getTemplateDraftAnnotations } from "../selectors";
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
            annotationLookups: [{annotationId: mockAnnotation.annotationId, lookupId: 1}],
            annotationTypes: mockAnnotationTypes,
            lookups: mockLookups,
        },
    };

    describe("addExistingAnnotationLogic", () => {

        it("adds annotation to draft annotations", () => {
            const store = createMockReduxStore({...startState});

            let state = store.getState();
            expect(getTemplateDraftAnnotations(state).length).to.equal(0);

            store.dispatch(addExistingAnnotation({
                ...mockAnnotation,
                annotationTypeId: 3,
            }));

            state = store.getState();
            expect(getTemplateDraftAnnotations(state).length).to.equal(1);
        });
        it("sets alert if the annotation type is not recognized", () => {
            const store = createMockReduxStore({...startState});

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(addExistingAnnotation({
                ...mockAnnotation,
                annotationTypeId: 100,
            }));

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
        it("sets alert if the annotation type is lookup and no annotationlookup junction exists", () => {
            const store = createMockReduxStore({
                ...startState,
                metadata: {
                    ...startState.metadata,
                    annotationLookups: [],
                },
            });

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(addExistingAnnotation({
                ...mockAnnotation,
                annotationTypeId: 3,
            }));

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
        it("sets alert if lookup id is invalid", () => {
            const store = createMockReduxStore({
                ...startState,
                metadata: {
                    ...startState.metadata,
                    lookups: [],
                },
            });

            let state = store.getState();
            expect(getAlert(state)).to.be.undefined;

            store.dispatch(addExistingAnnotation({
                ...mockAnnotation,
                annotationTypeId: 3,
            }));

            state = store.getState();
            expect(getAlert(state)).to.not.be.undefined;
        });
    });

    describe("getTemplateLogic", () => {
        it("sets applied template and updates uploads if addAnnotationsToUpload=true", (done) => {
            const key = "somekey";
            const store = createMockReduxStore({
                ...startState,
                upload: getMockStateWithHistory({
                    ...startState.upload.present,
                    [key]: {
                        barcode: "abc",
                        file: key,
                        wellIds: [1, 2],
                        wellLabels: ["A1", "A2"],
                    },
                }),
            });
            const getColumnValuesStub = stub().resolves(["a"]);
            const getTemplateStub = stub().resolves(mockMMSTemplate);

            sandbox.replace(labkeyClient, "getColumnValues", getColumnValuesStub);
            sandbox.replace(mmsClient, "getTemplate", getTemplateStub);

            expect(getAppliedTemplate(store.getState())).to.be.undefined;
            expect("Favorite Color" in getUpload(store.getState())[key]).to.be.false;

            store.dispatch(getTemplate(1, true));

            let count = 0;
            store.subscribe(() => {
               count++;
               if (count > 1) {
                   expect(getAppliedTemplate(store.getState())).to.not.be.undefined;
                   expect("Favorite Color" in getUpload(store.getState())[key]).to.be.true;
                   done();
               }
            });
        });
        it("updates template draft if addAnnotationsToUpload=false", (done) => {
            const getTemplateStub = stub().rejects();
            sandbox.replace(mmsClient, "getTemplate", getTemplateStub);
            const store = createMockReduxStore({
                ...startState,
            });

            expect(getAlert(store.getState())).to.be.undefined;

            store.dispatch(getTemplate(1));

            let count = 0;
            store.subscribe(() => {
                count++;
                if (count > 1) {
                    expect(getAlert(store.getState())).to.not.be.undefined;
                    done();
                }
            });
        });
        it("sets alert if getTemplate returns not OK response", (done) => {
            const getTemplateStub = stub().resolves(mockMMSTemplate);
            sandbox.replace(mmsClient, "getTemplate", getTemplateStub);
            const store = createMockReduxStore({
                ...startState,
            });

            expect(getTemplateDraft(store.getState())).to.deep.equal(DEFAULT_TEMPLATE_DRAFT);

            store.dispatch(getTemplate(1));

            let count = 0;
            store.subscribe(() => {
                count++;
                if (count > 1) {
                    expect(getTemplateDraft(store.getState())).to.not.deep.equal(DEFAULT_TEMPLATE_DRAFT);
                    done();
                }
            });
        });
    });

    describe("removeAnnotationsLogic", () => {
        it("removes annotations from template draft", () => {
            const store = createMockReduxStore({
                ...startState,
                template: getMockStateWithHistory({
                    ...startState.template.present,
                    draft: {
                        annotations: [
                            {
                                annotationId: 1,
                                annotationTypeId: 1,
                                annotationTypeName: ColumnType.TEXT,
                                canHaveManyValues: false,
                                index: 0,
                                required: false,
                            },
                            {
                                annotationId: 2,
                                annotationTypeId: 1,
                                annotationTypeName: ColumnType.TEXT,
                                canHaveManyValues: false,
                                index: 1,
                                required: false,
                            },
                            {
                                annotationId: 3,
                                annotationTypeId: 1,
                                annotationTypeName: ColumnType.TEXT,
                                canHaveManyValues: false,
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
        it("calls editTemplate endpoint if template id supplied", (done) => {
            const editTemplateStub = stub().resolves([1]);
            sandbox.replace(mmsClient, "editTemplate", editTemplateStub);
            const store = createMockReduxStore({
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

            let count = 0;
            store.subscribe(() => {
                count++;
                if (count === 2) {
                    expect(editTemplateStub.called).to.be.true;
                    done();
                }
            });
        });
        it("calls createTemplate endpoint if template id not supplied", (done) => {
            const createTemplateStub = stub().resolves([1]);
            sandbox.replace(mmsClient, "createTemplate", createTemplateStub);
            const store = createMockReduxStore({
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

            let count = 0;
            store.subscribe(() => {
                count++;
                if (count === 2) {
                    expect(createTemplateStub.called).to.be.true;
                    done();
                }
            });
        });
        it("sets alert if endpoint returns not OK response", (done) => {
            const editTemplateStub = stub().rejects();
            sandbox.replace(mmsClient, "editTemplate", editTemplateStub);
            const store = createMockReduxStore({
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

            let count = 0;
            store.subscribe(() => {
                count++;
                if (count === 2) {
                    expect(getAlert(store.getState())).to.not.be.undefined;
                    done();
                }
            });
        });
    });
});
