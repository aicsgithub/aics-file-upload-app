import { omit } from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { AnnotationName } from "../../constants";
import { RESET_HISTORY } from "../metadata/constants";
import { RESET_UPLOAD, VIEW_UPLOADS_SUCCEEDED } from "../route/constants";
import { ResetUploadAction, ViewUploadsSucceededAction } from "../route/types";
import {
  SELECT_BARCODE,
  SET_HAS_NO_PLATE_TO_UPLOAD,
} from "../selection/constants";
import {
  SelectBarcodeAction,
  SetHasNoPlateToUploadAction,
} from "../selection/types";
import { SET_APPLIED_TEMPLATE } from "../template/constants";
import { SetAppliedTemplateAction } from "../template/types";
import { TypeToDescriptionMap, FileModelId, UploadStateBranch } from "../types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
  CLEAR_UPLOAD_HISTORY,
  DELETE_UPLOADS,
  getUploadRowKey,
  INITIATE_UPLOAD,
  JUMP_TO_PAST_UPLOAD,
  JUMP_TO_UPLOAD,
  REPLACE_UPLOAD,
  RETRY_UPLOADS,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPDATE_UPLOADS,
  ADD_UPLOAD_FILES,
} from "./constants";
import { getUpload } from "./selectors";
import {
  AddUploadFilesAction,
  RemoveUploadsAction,
  ReplaceUploadAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UpdateUploadsAction,
} from "./types";

export const initialState = {};

const actionToConfigMap: TypeToDescriptionMap<UploadStateBranch> = {
  [ADD_UPLOAD_FILES]: {
    accepts: (action: AnyAction): action is AddUploadFilesAction =>
      action.type === ADD_UPLOAD_FILES,
    perform: (state: UploadStateBranch, action: AddUploadFilesAction) => {
      return action.payload.reduce(
        (uploads: UploadStateBranch, uploadRowId: FileModelId) => ({
          ...uploads,
          [getUploadRowKey(uploadRowId)]: { ...uploadRowId },
        }),
        { ...state }
      );
    },
  },
  [SELECT_BARCODE]: {
    accepts: (action: AnyAction): action is SelectBarcodeAction =>
      action.type === SELECT_BARCODE,
    perform: (state: UploadStateBranch) => {
      return Object.entries(state).reduce(
        (nextState, [key, metadata]) => ({
          ...nextState,
          [key]: {
            ...metadata,
            [AnnotationName.WELL]: undefined,
          },
        }),
        {} as UploadStateBranch
      );
    },
  },
  [SET_HAS_NO_PLATE_TO_UPLOAD]: {
    accepts: (action: AnyAction): action is SetHasNoPlateToUploadAction =>
      action.type === SET_HAS_NO_PLATE_TO_UPLOAD,
    perform: (state: UploadStateBranch) => {
      return Object.entries(state).reduce(
        (nextState, [key, metadata]) => ({
          ...nextState,
          [key]: {
            ...metadata,
            [AnnotationName.WELL]: undefined,
          },
        }),
        {} as UploadStateBranch
      );
    },
  },
  [DELETE_UPLOADS]: {
    accepts: (action: AnyAction): action is RemoveUploadsAction =>
      action.type === DELETE_UPLOADS,
    perform: (state: UploadStateBranch, action: RemoveUploadsAction) =>
      omit(state, action.payload),
  },
  [UPDATE_UPLOAD]: {
    accepts: (action: AnyAction): action is UpdateUploadAction =>
      action.type === UPDATE_UPLOAD,
    perform: (state: UploadStateBranch, action: UpdateUploadAction) => {
      // prevent updating an upload that doesn't exist anymore
      if (!state[action.payload.key]) {
        return state;
      }

      return {
        ...state,
        [action.payload.key]: {
          ...state[action.payload.key],
          ...action.payload.upload,
        },
      };
    },
  },
  [UPDATE_UPLOAD_ROWS]: {
    accepts: (action: AnyAction): action is UpdateUploadRowsAction =>
      action.type === UPDATE_UPLOAD_ROWS,
    perform: (state: UploadStateBranch, action: UpdateUploadRowsAction) => {
      const { metadataUpdate, uploadKeys } = action.payload;
      const update: UploadStateBranch = {};
      uploadKeys.forEach((key) => {
        update[key] = {
          ...state[key],
          ...metadataUpdate,
        };
      });
      return {
        ...state,
        ...update,
      };
    },
  },
  [UPDATE_UPLOADS]: {
    accepts: (action: AnyAction): action is UpdateUploadAction =>
      action.type === UPDATE_UPLOADS,
    perform: (
      state: UploadStateBranch,
      { payload: { clearAll, uploads: replacement } }: UpdateUploadsAction
    ) => (clearAll ? { ...replacement } : { ...state, ...replacement }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (
      state: UploadStateBranch,
      { payload: { replacementState } }: ReplaceUploadAction
    ) => ({
      ...getUpload(replacementState),
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: () => ({}),
  },
  [SET_APPLIED_TEMPLATE]: {
    accepts: (action: AnyAction): action is SetAppliedTemplateAction =>
      action.type === SET_APPLIED_TEMPLATE,
    perform: (
      state: UploadStateBranch,
      { payload: { uploads } }: SetAppliedTemplateAction
    ) => ({
      ...uploads,
    }),
  },
  [VIEW_UPLOADS_SUCCEEDED]: {
    accepts: (action: AnyAction): action is ViewUploadsSucceededAction =>
      action.type === VIEW_UPLOADS_SUCCEEDED,
    perform: (
      _: UploadStateBranch,
      { payload: { originalUploads } }: ViewUploadsSucceededAction
    ) => ({
      ...originalUploads,
    }),
  },
};

const upload = makeReducer<UploadStateBranch>(actionToConfigMap, initialState);

const options: UndoableOptions = {
  clearHistoryType: CLEAR_UPLOAD_HISTORY,
  filter: getReduxUndoFilterFn([
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    CLEAR_UPLOAD_HISTORY,
    RETRY_UPLOADS,
  ]),
  initTypes: [RESET_HISTORY],
  jumpToPastType: JUMP_TO_PAST_UPLOAD,
  jumpType: JUMP_TO_UPLOAD,
  limit: 100,
};
export default undoable(upload, options);
