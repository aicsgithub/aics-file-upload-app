import { expect } from "chai";

import { closeModal } from "../../feedback/actions";
import { closeUpload } from "../../route/actions";
import {
  getMockStateWithHistory,
  mockAnnotationDraft,
  mockMMSTemplate,
  mockTemplateDraft,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { TemplateStateBranch } from "../../types";
import { replaceUpload } from "../../upload/actions";
import { startTemplateDraft, updateTemplateDraft } from "../actions";
import { DEFAULT_TEMPLATE_DRAFT } from "../constants";
import reducer from "../reducer";
import { initialState } from "../reducer";
import { getAppliedTemplate } from "../selectors";

describe("template reducer", () => {
  describe("replaceUpload", () => {
    it("sets appliedTemplate", () => {
      const result = reducer(
        getMockStateWithHistory(initialState),
        replaceUpload("/path/file.json", nonEmptyStateForInitiatingUpload)
      );
      expect(result.present.appliedTemplate).to.equal(
        getAppliedTemplate(nonEmptyStateForInitiatingUpload)
      );
    });
  });
  describe("closeUpload", () => {
    it("clears appliedTemplate", () => {
      const result = reducer(
        nonEmptyStateForInitiatingUpload.template,
        closeUpload()
      );
      expect(result.present.appliedTemplate).to.be.undefined;
    });
  });

  describe("updateTemplateDraft", () => {
    it("updates the draft name without overwriting the annotations", () => {
      const annotations = [mockAnnotationDraft];
      const state: TemplateStateBranch = {
        ...initialState,
        draft: { annotations },
      };

      const result = reducer(
        getMockStateWithHistory(state),
        updateTemplateDraft({ name: "My Draft" })
      );

      expect(result.present.draft.name).to.equal("My Draft");
      expect(result.present.draft.annotations).to.deep.equal(annotations);
    });
  });
  describe("closeModal", () => {
    it("clears templateDraft and originalTemplateHasBeenUsed if payload is 'templateEditor'", () => {
      const result = reducer(
        getMockStateWithHistory({
          draft: mockTemplateDraft,
          original: mockMMSTemplate,
          originalTemplateHasBeenUsed: true,
        }),
        closeModal("templateEditor")
      );
      expect(result.present.draft).to.equal(DEFAULT_TEMPLATE_DRAFT);
      expect(result.present.original).to.be.undefined;
      expect(result.present.originalTemplateHasBeenUsed).to.be.undefined;
    });
    it("returns prev state if payload is not 'templateEditor'", () => {
      const state = getMockStateWithHistory(initialState);
      const result = reducer(state, closeModal("settings"));
      expect(result.present).to.deep.equal(initialState);
    });
  });
  describe("startTemplateDraft", () => {
    it("sets draft, original, and originalTemplateHasBeenUsed", () => {
      const result = reducer(
        getMockStateWithHistory(initialState),
        startTemplateDraft(mockMMSTemplate, mockTemplateDraft, true)
      );
      expect(result.present.draft).to.equal(mockTemplateDraft);
      expect(result.present.original).to.equal(mockMMSTemplate);
      expect(result.present.originalTemplateHasBeenUsed).to.equal(true);
    });
  });
});
