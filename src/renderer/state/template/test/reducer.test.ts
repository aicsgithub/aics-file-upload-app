import { expect } from "chai";

import { closeUploadTab } from "../../route/actions";
import {
  getMockStateWithHistory,
  mockAnnotationDraft,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";
import { updateTemplateDraft } from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";
import { getAppliedTemplate } from "../selectors";
import { TemplateStateBranch } from "../types";

describe("template reducer", () => {
  describe("replaceUpload", () => {
    it("sets appliedTemplate", () => {
      const replacement = {
        metadata: {
          created: new Date(),
          modified: new Date(),
          name: "test",
        },
        state: nonEmptyStateForInitiatingUpload,
      };
      const result = reducer(
        getMockStateWithHistory(initialState),
        replaceUpload(replacement)
      );
      expect(result.present.appliedTemplate).to.equal(
        getAppliedTemplate(nonEmptyStateForInitiatingUpload)
      );
    });
  });
  describe("closeUploadTab", () => {
    it("clears appliedTemplate", () => {
      const result = reducer(
        nonEmptyStateForInitiatingUpload.template,
        closeUploadTab()
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
});
