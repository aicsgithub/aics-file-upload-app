import { State } from "../types";

// BASIC SELECTORS
export const getPage = (state: State) => state.route.page;
export const getView = (state: State) => state.route.view;
export const getNextPage = (state: State) => state.route.nextPage;
