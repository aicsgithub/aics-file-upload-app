import { expect } from "chai";

import { closeModal } from "../../feedback/actions";
import { resetUpload } from "../../route/actions";
import {
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
        initialState,
        replaceUpload("/path/file.json", nonEmptyStateForInitiatingUpload)
      );
      expect(result.appliedTemplate).to.equal(
        getAppliedTemplate(nonEmptyStateForInitiatingUpload)
      );
    });
  });
  describe("resetUpload", () => {
    it("clears appliedTemplate", () => {
      const result = reducer(
        nonEmptyStateForInitiatingUpload.template,
        resetUpload()
      );
      expect(result.appliedTemplate).to.be.undefined;
    });
  });

  describe("updateTemplateDraft", () => {
    it("updates the draft name without overwriting the annotations", () => {
      const annotations = [mockAnnotationDraft];
      const state: TemplateStateBranch = {
        ...initialState,
        draft: { annotations },
      };

      const result = reducer(state, updateTemplateDraft({ name: "My Draft" }));

      expect(result.draft.name).to.equal("My Draft");
      expect(result.draft.annotations).to.deep.equal(annotations);
    });
  });
  describe("closeModal", () => {
    it("clears templateDraft if payload is 'templateEditor'", () => {
      const result = reducer(
        {
          draft: mockTemplateDraft,
          original: mockMMSTemplate,
        },
        closeModal("templateEditor")
      );
      expect(result.draft).to.equal(DEFAULT_TEMPLATE_DRAFT);
      expect(result.original).to.be.undefined;
    });
    it("returns prev state if payload is not 'templateEditor'", () => {
      const state = initialState;
      const result = reducer(state, closeModal("openTemplate"));
      expect(result).to.deep.equal(initialState);
    });
  });
  describe("startTemplateDraft", () => {
    it("sets draft and original", () => {
      const result = reducer(
        initialState,
        startTemplateDraft(mockMMSTemplate, mockTemplateDraft)
      );
      expect(result.draft).to.equal(mockTemplateDraft);
      expect(result.original).to.equal(mockMMSTemplate);
    });
  });
});
