import { State } from "../types";

export const getTemplateDraft = (state: State) => state.template.present.draft;
