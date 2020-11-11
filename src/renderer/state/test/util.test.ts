import { expect } from "chai";
import { AnyAction } from "redux";
import { match, stub } from "sinon";

import { APP_ID } from "../../constants";
import { TypeToDescriptionMap } from "../types";
import {
  batchActions,
  enableBatching,
  handleUploadProgress,
  makeConstant,
  makeReducer,
} from "../util";

describe("state utilities", () => {
  describe("makeConstant", () => {
    it("returns a string in the form 'APP_NAMESPACE/REDUCER/ACTION_TYPE'", () => {
      const constant = makeConstant("foo", "bar");
      const [namespace, reducer, type] = constant.split("/");
      expect(constant).to.be.a("string");
      expect(namespace).to.equal(APP_ID);
      expect(reducer).to.equal("FOO");
      expect(type).to.equal("BAR");
    });
  });

  describe("makeReducer", () => {
    const ACTION_CONSTANT = "FAKE_CONSTANT";
    interface Action {
      type: string;
      arbitraryProp: boolean;
    }
    interface State {
      flag: boolean;
    }

    const initialState: State = {
      flag: false,
    };

    const typeToDescriptionMap: TypeToDescriptionMap<State> = {
      [ACTION_CONSTANT]: {
        accepts: (action: AnyAction): action is Action =>
          // https://eslint.org/docs/rules/no-prototype-builtins
          Object.prototype.hasOwnProperty.call(action, "arbitraryProp"),
        perform: (state: Partial<State>, action: AnyAction) => ({
          ...state,
          flag: action.arbitraryProp,
        }),
      },
    };

    // typed as `any` because we know that `beforeEach` will in fact make this a valid function in every
    // assertion block
    let reducer: any;

    beforeEach(() => {
      reducer = makeReducer(typeToDescriptionMap, initialState);
    });

    it("returns a reducer function", () => {
      expect(reducer).to.be.a("function");
    });

    it("returns given state if action type does not match key in typeToDescriptionMap", () => {
      const fakeAction = { type: "FAKE", arbitraryProp: true };
      expect(reducer(initialState, fakeAction)).to.equal(initialState);
    });

    it("returns given state if action does not pass type assertion", () => {
      const fakeAction = { type: ACTION_CONSTANT, payload: "Also fake" };
      expect(reducer(initialState, fakeAction)).to.equal(initialState);
    });

    it("returns the output of ActionDescription.perform if the type assertion passes", () => {
      const realAction = { type: ACTION_CONSTANT, arbitraryProp: true };
      const expectedOutput = typeToDescriptionMap[ACTION_CONSTANT].perform(
        initialState,
        realAction
      );
      const nextState = reducer(initialState, realAction);
      expect(nextState).to.not.equal(initialState);
      expect(nextState).to.deep.equal(expectedOutput);
    });
  });

  describe("enableBatching", () => {
    interface MockState {
      tortilla: boolean;
      beans: boolean;
      cheese: boolean;
    }

    interface MockAction {
      type: string;
      key: keyof MockState;
      value: boolean;
    }

    const TOGGLE_BURRITO_INGREDIENT = "TOGGLE_BURRITO_INGRED";

    const toggleBurritoIngredientCreator = (
      key: keyof MockState,
      value: boolean
    ): MockAction => ({
      key,
      type: TOGGLE_BURRITO_INGREDIENT,
      value,
    });

    const initialState: MockState = {
      beans: false,
      cheese: false,
      tortilla: false,
    };

    const reducer = (state: MockState = initialState, action: AnyAction) => {
      switch (action.type) {
        case TOGGLE_BURRITO_INGREDIENT:
          return {
            ...state,
            [action.key]: action.value,
          };
        default:
          return state;
      }
    };

    const batchingReducer = enableBatching<MockState>(reducer);

    it("applies all actions in a batched action to state", () => {
      const enableBeans = toggleBurritoIngredientCreator("beans", true);
      const enableCheese = toggleBurritoIngredientCreator("cheese", true);

      const expectedState: MockState = {
        beans: true,
        cheese: true,
        tortilla: false,
      };

      expect(
        batchingReducer(initialState, batchActions([enableBeans, enableCheese]))
      ).to.deep.equal(expectedState);
    });

    it("applies non-batched actions as usual", () => {
      const enableBeans = toggleBurritoIngredientCreator("beans", true);
      const expectedState: MockState = {
        beans: true,
        cheese: false,
        tortilla: false,
      };

      const result = batchingReducer(initialState, enableBeans);
      expect(result).to.deep.equal(reducer(initialState, enableBeans));
      expect(result).to.deep.equal(expectedState);
    });
  });
  describe("handleUploadProgress", () => {
    it("returns a function that calls postMessage with the correct stats over time", () => {
      const onProgress = stub();
      const copyProgressCb = handleUploadProgress(["a", "b"], onProgress);

      copyProgressCb("a", 1, 12);
      expect(
        onProgress.calledWith(
          match({
            completedBytes: 1,
            totalBytes: 12,
          })
        )
      ).to.be.true;
      onProgress.reset();

      copyProgressCb("b", 2, 12);
      expect(
        onProgress.calledWith(
          match({
            completedBytes: 3,
            totalBytes: 12,
          })
        )
      ).to.be.true;
      onProgress.reset();

      // a worker thread has reported that 2 bytes of file "a" have been copied in total
      copyProgressCb("a", 2, 12);
      // 2 bytes for file "a", 2 bytes for file "b" = 4 bytes total copied
      expect(
        onProgress.calledWith(
          match({
            completedBytes: 4,
            totalBytes: 12,
          })
        )
      ).to.be.true;
    });
  });
});
