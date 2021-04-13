import { get } from "lodash";
import { createLogic } from "redux-logic";

import { getApplyTemplateInfo } from "../../util";
import { requestFailed } from "../actions";
import { requestTemplates } from "../metadata/actions";
import { getBooleanAnnotationTypeId } from "../metadata/selectors";
import {
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
} from "../types";
import { getCanSaveUploadDraft, getUpload } from "../upload/selectors";

import { saveTemplateSucceeded, setAppliedTemplate } from "./actions";
import { SAVE_TEMPLATE } from "./constants";
import { getAppliedTemplate } from "./selectors";

const saveTemplateLogic = createLogic({
  process: async (
    { action, getState, mmsClient }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { templateId, name, annotations } = action.payload;

    let createdTemplateId;
    try {
      const request = { name, annotations };
      if (templateId) {
        createdTemplateId = await mmsClient.editTemplate(request, templateId);
      } else {
        createdTemplateId = await mmsClient.createTemplate(request);
      }

      dispatch(saveTemplateSucceeded(createdTemplateId));
    } catch (e) {
      const error = get(e, ["response", "data", "error"], e.message);
      dispatch(
        requestFailed(
          "Could not save template: " + error,
          AsyncRequest.SAVE_TEMPLATE
        )
      );
      done();
      return;
    }

    // this need to be dispatched separately because it has logics associated with them
    dispatch(requestTemplates());

    if (getCanSaveUploadDraft(getState())) {
      const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
      if (!booleanAnnotationTypeId) {
        dispatch(
          requestFailed(
            "Could not get boolean annotation type id. Contact Software",
            AsyncRequest.SAVE_TEMPLATE
          )
        );
        done();
        return;
      }

      try {
        const { template, uploads } = await getApplyTemplateInfo(
          createdTemplateId,
          mmsClient,
          dispatch,
          booleanAnnotationTypeId,
          getUpload(getState()),
          getAppliedTemplate(getState())
        );
        dispatch(setAppliedTemplate(template, uploads));
      } catch (e) {
        const error = `Could not retrieve template and update uploads: ${get(
          e,
          ["response", "data", "error"],
          e.message
        )}`;
        dispatch(requestFailed(error, AsyncRequest.GET_TEMPLATE));
      }
    }
    done();
  },
  type: SAVE_TEMPLATE,
});

export default [saveTemplateLogic];
