import { existsSync } from "fs";
import { platform } from "os";

import { Menu, MenuItem } from "electron";
import { castArray, difference, isEmpty } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { WELL_ANNOTATION_NAME } from "../../constants";
import {
  FSSResponseFile,
  ImageModelMetadata,
} from "../../services/aicsfiles/types";
import { JSSJobStatus } from "../../services/job-status-client/types";
import LabkeyClient from "../../services/labkey-client";
import MMSClient from "../../services/mms-client";
import {
  convertUploadPayloadToImageModelMetadata,
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  getPlateInfo,
  makePosixPathCompatibleWithPlatform,
  retrieveFileMetadata,
} from "../../util";
import { requestFailed } from "../actions";
import {
  openSetMountPointNotification,
  setErrorAlert,
} from "../feedback/actions";
import { getWithRetry } from "../feedback/util";
import {
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
  getSelectionHistory,
  getTemplateHistory,
  getUploadHistory,
  getWellAnnotation,
} from "../metadata/selectors";
import {
  clearSelectionHistory,
  jumpToPastSelection,
  selectBarcode,
  setPlate,
} from "../selection/actions";
import { associateByWorkflow } from "../setting/actions";
import { getMountPoint } from "../setting/selectors";
import {
  clearTemplateHistory,
  jumpToPastTemplate,
  setAppliedTemplate,
} from "../template/actions";
import {
  AsyncRequest,
  Logger,
  Page,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
  State,
  UploadStateBranch,
} from "../types";
import {
  clearUploadDraft,
  clearUploadHistory,
  jumpToPastUpload,
  updateUploads,
} from "../upload/actions";
import { getUploadRowKey } from "../upload/constants";
import { getCanSaveUploadDraft } from "../upload/selectors";
import { batchActions } from "../util";

import {
  openEditFileMetadataTabSucceeded,
  resetUpload,
  selectPage,
} from "./actions";
import {
  CLOSE_UPLOAD,
  OPEN_EDIT_FILE_METADATA_TAB,
  START_NEW_UPLOAD,
} from "./constants";
import { OpenEditFileMetadataTabAction } from "./types";

// have to cast here because Electron's typings for MenuItem is incomplete
const getFileMenu = (menu: Menu): MenuItem | undefined =>
  menu.items.find(
    (menuItem: MenuItem) => menuItem.label.toLowerCase() === "file"
  );

export const setSwitchEnvEnabled = (
  menu: Menu,
  enabled: boolean,
  logger: Logger
): void => {
  const fileMenu = getFileMenu(menu);
  if (!fileMenu || !fileMenu.submenu) {
    logger.error("Could not update application menu");
    return;
  }

  const switchEnvironmentMenuItem = fileMenu.submenu.items.find(
    (menuItem: MenuItem) =>
      menuItem.label.toLowerCase() === "switch environment"
  );
  if (switchEnvironmentMenuItem) {
    switchEnvironmentMenuItem.enabled = enabled;
  } else {
    logger.error("Could not update application menu");
  }
};

const stateBranchHistory = [
  {
    clearHistory: clearSelectionHistory,
    getHistory: getSelectionHistory,
    jumpToPast: jumpToPastSelection,
  },
  {
    clearHistory: clearTemplateHistory,
    getHistory: getTemplateHistory,
    jumpToPast: jumpToPastTemplate,
  },
  {
    clearHistory: clearUploadHistory,
    getHistory: getUploadHistory,
    jumpToPast: jumpToPastUpload,
  },
];
export const resetHistoryActions = stateBranchHistory.flatMap((history) => [
  history.jumpToPast(0),
  history.clearHistory(),
]);

// Returns common actions needed because we share the upload tab between upload drafts for now
// Some of these actions cannot be done in the reducer because they are handled by a higher-order reducer
// from redux-undo.
export const handleStartingNewUploadJob = (
  logger: Logger,
  state: State,
  getApplicationMenu: () => Menu | null
): AnyAction[] => {
  const actions = [
    selectPage(Page.AddCustomData),
    clearUploadDraft(),
    clearUploadHistory(),
    clearSelectionHistory(),
    clearTemplateHistory(),
  ];
  const isMountedAsExpected = existsSync(
    makePosixPathCompatibleWithPlatform("/allen/aics", platform())
  );
  const menu = getApplicationMenu();
  if (menu) {
    setSwitchEnvEnabled(menu, false, logger);
  }
  const mountPoint = getMountPoint(state);
  if (!isMountedAsExpected && !mountPoint) {
    actions.push(openSetMountPointNotification());
  }

  return actions;
};

const resetUploadLogic = createLogic({
  type: [CLOSE_UPLOAD, START_NEW_UPLOAD],
  validate: async (
    deps: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, getState } = deps;

    try {
      const { cancelled } = await ensureDraftGetsSaved(
        deps,
        getCanSaveUploadDraft(getState()),
        getCurrentUploadFilePath(getState())
      );

      if (cancelled) {
        // prevent action from getting to reducer
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }

    next({
      // we want to write to local storage but also keep this as a batched action
      ...clearUploadDraft(),
      ...batchActions([
        ...resetHistoryActions,
        resetUpload(),
        // If the action isn't after the resetHistoryActions then the side-effects
        // of this action may be reset - Sean M 02/08/21
        action,
      ]),
    });
  },
});

const convertImageModelMetadataToUploadStateBranch = (
  metadata: ImageModelMetadata[]
): UploadStateBranch => {
  return metadata.reduce(
    (accum: UploadStateBranch, curr: ImageModelMetadata) => {
      const {
        archiveFilePath,
        channelId,
        localFilePath,
        originalPath,
        positionIndex,
        scene,
        subImageName,
      } = curr;
      const file = originalPath || localFilePath || archiveFilePath || "";
      const key: string = getUploadRowKey({
        channelId,
        file,
        positionIndex,
        scene,
        subImageName,
      });
      return {
        ...accum,
        [key]: {
          ...curr,
          file,
        },
      };
    },
    {} as UploadStateBranch
  );
};

const getPlateRelatedActions = async (
  wellIds: number[],
  labkeyClient: LabkeyClient,
  mmsClient: MMSClient,
  dispatch: ReduxLogicNextCb
) => {
  const actions: AnyAction[] = [];
  wellIds = castArray(wellIds).map((w: string | number) =>
    parseInt(w + "", 10)
  );
  // assume all wells have same barcode
  const wellId = wellIds[0];
  // we want to find the barcode associated with any well id found in this upload
  const barcode = await labkeyClient.getPlateBarcodeAndAllImagingSessionIdsFromWellId(
    wellId
  );
  const imagingSessionIds = await labkeyClient.getImagingSessionIdsForBarcode(
    barcode
  );
  const { plate, wells } = await getPlateInfo(
    barcode,
    imagingSessionIds,
    mmsClient,
    dispatch
  );
  actions.push(
    selectBarcode(barcode, imagingSessionIds),
    setPlate(plate, wells, imagingSessionIds)
  );

  return actions;
};

const openEditFileMetadataTabLogic = createLogic({
  process: async (
    {
      action,
      ctx,
      fms,
      getApplicationMenu,
      getState,
      labkeyClient,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<OpenEditFileMetadataTabAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    // Open the upload tab and make sure application menu gets updated and redux-undo histories reset.
    dispatch(
      batchActions(
        handleStartingNewUploadJob(logger, state, getApplicationMenu)
      )
    );

    // Second, we fetch the file metadata
    let fileMetadataForJob: ImageModelMetadata[];
    if (ctx.fileIds) {
      // acquired during validate phase
      const { fileIds } = ctx;
      const request = () => retrieveFileMetadata(fileIds, fms);
      try {
        fileMetadataForJob = await getWithRetry(request, dispatch);
      } catch (e) {
        const error = `Could not retrieve file metadata for fileIds=${fileIds.join(
          ", "
        )}: ${e.message}`;
        logger.error(error);
        dispatch(requestFailed(error, AsyncRequest.GET_FILE_METADATA_FOR_JOB));
        done();
        return;
      }
    } else if (action.payload.serviceFields?.files) {
      fileMetadataForJob = await convertUploadPayloadToImageModelMetadata(
        action.payload.serviceFields?.files,
        fms
      );
    } else {
      dispatch(
        requestFailed(
          "job is missing information",
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      );
      done();
      return;
    }

    let updateUploadsAction: AnyAction = updateUploads({}, true);
    const actions: AnyAction[] = [];
    const newUpload = convertImageModelMetadataToUploadStateBranch(
      fileMetadataForJob
    );
    if (fileMetadataForJob && fileMetadataForJob[0]) {
      // if we have a well, we can get the barcode and other plate info. This will be necessary
      // to display the well editor
      const wellAnnotationName =
        getWellAnnotation(getState())?.name || WELL_ANNOTATION_NAME;
      let wellIds: any = fileMetadataForJob[0][wellAnnotationName];
      if (wellIds) {
        wellIds = castArray(wellIds).map((w: string | number) =>
          parseInt(w + "", 10)
        );
        try {
          const plateRelatedActions = await getPlateRelatedActions(
            wellIds,
            labkeyClient,
            mmsClient,
            dispatch
          );
          actions.push(...plateRelatedActions);
        } catch (e) {
          const error = `Could not get plate information from upload: ${e.message}`;
          logger.error(error);
          dispatch(
            requestFailed(error, AsyncRequest.GET_FILE_METADATA_FOR_JOB)
          );
          done();
          return;
        }
      } else {
        actions.push(associateByWorkflow(true));
      }

      // Currently we only allow applying one template at a time
      if (fileMetadataForJob[0].templateId) {
        const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
        if (!booleanAnnotationTypeId) {
          dispatch(
            requestFailed(
              "Boolean annotation type id not found. Contact Software.",
              AsyncRequest.GET_FILE_METADATA_FOR_JOB
            )
          );
          done();
          return;
        }
        try {
          const { template, uploads } = await getApplyTemplateInfo(
            fileMetadataForJob[0].templateId,
            mmsClient,
            dispatch,
            booleanAnnotationTypeId,
            newUpload
          );
          updateUploadsAction = setAppliedTemplate(template, uploads);
        } catch (e) {
          dispatch(
            requestFailed(
              "Could not open upload editor: " + e.message,
              AsyncRequest.GET_FILE_METADATA_FOR_JOB
            )
          );
        }
      } else {
        updateUploadsAction = updateUploads(newUpload, true);
      }
    }

    dispatch(
      batchActions([
        ...actions,
        updateUploadsAction,
        openEditFileMetadataTabSucceeded(updateUploadsAction.payload.uploads),
      ])
    );
    done();
  },
  type: OPEN_EDIT_FILE_METADATA_TAB,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<
      OpenEditFileMetadataTabAction
    >,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, ctx, getState } = deps;
    try {
      const { cancelled } = await ensureDraftGetsSaved(
        deps,
        getCanSaveUploadDraft(getState()),
        getCurrentUploadFilePath(getState())
      );
      if (cancelled) {
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }

    // Validate the job passed in as the action payload
    const { payload: job } = action;
    if (
      job.status === JSSJobStatus.SUCCEEDED &&
      job.serviceFields?.result &&
      Array.isArray(job?.serviceFields?.result) &&
      !isEmpty(job?.serviceFields?.result)
    ) {
      const originalFileIds = job.serviceFields.result.map(
        ({ fileId }: FSSResponseFile) => fileId
      );
      const deletedFileIds = job.serviceFields.deletedFileIds
        ? castArray(job.serviceFields.deletedFileIds)
        : [];
      ctx.fileIds = difference(originalFileIds, deletedFileIds);
      if (isEmpty(ctx.fileIds)) {
        reject(setErrorAlert("All files in this upload have been deleted!"));
      } else {
        next(action);
      }
    } else if (job.serviceFields?.files && !isEmpty(job.serviceFields?.files)) {
      next(action);
    } else {
      reject(setErrorAlert("upload has missing information"));
    }
  },
});

export default [openEditFileMetadataTabLogic, resetUploadLogic];
