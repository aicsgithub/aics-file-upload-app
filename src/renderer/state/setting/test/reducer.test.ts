import { expect } from "chai";

import { setPlate } from "../../selection/actions";
import { saveTemplateSucceeded } from "../../template/actions";
import { mockPlate, mockState, mockWells } from "../../test/mocks";
import { replaceUpload } from "../../upload/actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("setting reducer", () => {
  describe("replaceUpload", () => {
    it("sets associateByWorkflow", () => {
      const result = reducer(
        {
          ...initialState,
          associateByWorkflow: true,
        },
        replaceUpload("/path/file.json", {
          ...mockState,
          setting: {
            ...mockState.setting,
            associateByWorkflow: false,
          },
        })
      );
      expect(result.associateByWorkflow).to.be.false;
    });
  });
  describe("setPlate", () => {
    it("sets associateByWorkflow to false", () => {
      const result = reducer(
        { ...initialState, associateByWorkflow: true },
        setPlate(mockPlate, mockWells)
      );
      expect(result.associateByWorkflow).to.be.false;
    });
  });
  describe("saveTemplateSucceeded", () => {
    it("sets templateId", () => {
      const result = reducer(initialState, saveTemplateSucceeded(1));
      expect(result.templateId).to.equal(1);
    });
  });
});
