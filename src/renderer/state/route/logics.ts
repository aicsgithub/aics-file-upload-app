import { existsSync } from "fs";
import { platform } from "os";

import { Menu, MenuItem } from "electron";
import { castArray, difference, groupBy, isEmpty, uniq } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
  DAY_AS_MS,
  HOUR_AS_MS,
  MINUTE_AS_MS,
  WELL_ANNOTATION_NAME,
} from "../../constants";
import {
  Annotation,
  FSSResponseFile,
  LabKeyFileMetadata,
} from "../../services/aicsfiles/types";
import { JSSJobStatus } from "../../services/job-status-client/types";
import LabkeyClient, { LK_SCHEMA } from "../../services/labkey-client";
import {
  ColumnType,
  Lookup,
  ScalarType,
} from "../../services/labkey-client/types";
import MMSClient from "../../services/mms-client";
import { getUploadRowKey } from "../../state/upload/constants";
import { Duration } from "../../types";
import {
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  getPlateInfo,
  makePosixPathCompatibleWithPlatform,
} from "../../util";
import { requestFailed } from "../actions";
import {
  openSetMountPointNotification,
  setErrorAlert,
} from "../feedback/actions";
import {
  getAnnotationLookups,
  getAnnotations,
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
  getLookups,
  getSelectionHistory,
  getUploadHistory,
} from "../metadata/selectors";
import {
  clearSelectionHistory,
  jumpToPastSelection,
  selectBarcode,
  setHasNoPlateToUpload,
  setPlate,
} from "../selection/actions";
import { getMountPoint } from "../setting/selectors";
import { setAppliedTemplate } from "../template/actions";
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
  UploadRequest,
  UploadStateBranch,
} from "../types";
import {
  clearUploadDraft,
  clearUploadHistory,
  jumpToPastUpload,
} from "../upload/actions";
import { getCanSaveUploadDraft } from "../upload/selectors";
import { batchActions } from "../util";

import { openJobAsUploadSucceeded, resetUpload, selectPage } from "./actions";
import {
  CLOSE_UPLOAD,
  OPEN_JOB_AS_UPLOAD,
  START_NEW_UPLOAD,
} from "./constants";
import { OpenJobAsUploadAction, Upload } from "./types";

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
  const actions: AnyAction[] = [
    selectPage(Page.AddCustomData),
    clearUploadDraft(),
    clearUploadHistory(),
    clearSelectionHistory(),
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

/*
  Transforms file metadata given into a table like format easier for displaying to users or exporting to character
  separated value sets.
*/
function convertUploadRequestsToUploadStateBranch(
  files: UploadRequest[],
  state: State
): Upload {
  const annotations = getAnnotations(state);
  const lookups = getLookups(state);
  const annotationLookups = getAnnotationLookups(state);
  const annotationIdToAnnotationMap = groupBy(annotations, "annotationId");
  const annotationIdToLookupMap = annotationLookups.reduce(
    (mapSoFar, curr) => ({
      [curr.annotationId]: lookups.find((l) => l.lookupId === curr.lookupId),
      ...mapSoFar,
    }),
    {} as { [annotationId: number]: Lookup | undefined }
  );

  let templateId: number | undefined = undefined;
  const uploadMetadata = files.reduce((uploadSoFar, file) => {
    templateId = file.customMetadata.templateId || templateId;
    return file.customMetadata.annotations.reduce(
      (keyToMetadataSoFar: UploadStateBranch, annotation: Annotation) => {
        const key = getUploadRowKey({
          file: file.file.originalPath,
          ...annotation,
        });
        const annotationDefinition =
          annotationIdToAnnotationMap[annotation.annotationId]?.[0];
        if (!annotationDefinition) {
          throw new Error(
            `Unable to find matching Annotation for Annotation ID: ${annotation.annotationId}`
          );
        }

        let values: any[] = annotation.values;
        switch (annotationDefinition["annotationTypeId/Name"]) {
          case ColumnType.BOOLEAN:
            values = values.map((v) => Boolean(v));
            break;
          case ColumnType.DATE:
          case ColumnType.DATETIME:
            values = values.map((v) => new Date(`${v}`));
            break;
          case ColumnType.LOOKUP:
            if (
              annotationIdToLookupMap[annotation.annotationId]?.[
                "scalarTypeId/Name"
              ] === ScalarType.INT
            ) {
              values = values.map((v) => parseInt(v, 10));
            }
            break;
          case ColumnType.NUMBER:
            values = values.map((v) => {
              try {
                return parseFloat(v);
              } catch (e) {
                return v;
              }
            });
            break;
          case ColumnType.DURATION:
            values = values.map(
              (v: string): Duration => {
                let remainingMs = parseInt(v);

                function calculateUnit(unitAsMs: number, useFloor = true) {
                  const numUnit = useFloor
                    ? Math.floor(remainingMs / unitAsMs)
                    : remainingMs / unitAsMs;
                  if (numUnit > 0) {
                    remainingMs -= numUnit * unitAsMs;
                  }
                  return numUnit;
                }

                const days = calculateUnit(DAY_AS_MS);
                const hours = calculateUnit(HOUR_AS_MS);
                const minutes = calculateUnit(MINUTE_AS_MS);
                const seconds = calculateUnit(1000, false);

                return { days, hours, minutes, seconds };
              }
            );
        }

        return {
          ...keyToMetadataSoFar,
          [key]: {
            ...(keyToMetadataSoFar[key] || {}),
            file: file.file.originalPath,
            fileId: file.fileId,
            channelId: annotation.channelId,
            fovId: annotation.fovId,
            positionIndex: annotation.positionIndex,
            scene: annotation.scene,
            subImageName: annotation.subImageName,
            [annotationDefinition.name]: uniq([
              ...(keyToMetadataSoFar[key]?.[annotationDefinition.name] || []),
              ...values,
            ]),
          },
        };
      },
      uploadSoFar
    );
  }, {} as UploadStateBranch);

  if (!templateId) {
    throw new Error("Could not find the template used in the upload");
  }

  return { templateId, uploadMetadata };
}

const RELEVANT_FILE_COLUMNS = [
  "FileName",
  "FileSize",
  "FileType",
  "ThumbnailId",
  "ThumbnailLocalFilePath",
  "ArchiveFilePath",
  "LocalFilePath",
  "PublicFilePath",
  "Modified",
  "ModifiedBy",
];

const openJobAsUploadLogic = createLogic({
  process: async (
    {
      action,
      ctx,
      getApplicationMenu,
      getState,
      labkeyClient,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<OpenJobAsUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    try {
      // Open the upload tab and make sure application menu gets updated and redux-undo histories reset.
      dispatch(
        batchActions(
          handleStartingNewUploadJob(logger, state, getApplicationMenu)
        )
      );

      // Second, we fetch the file metadata
      let files = action.payload.serviceFields?.files;
      if (!files || ctx.fileIds) {
        files = await Promise.all(
          ctx.fileIds.map(async (fileId: string) => {
            const [labkeyFileMetadata, customMetadata] = await Promise.all([
              labkeyClient.selectFirst<LabKeyFileMetadata>(
                LK_SCHEMA.FMS,
                "File",
                RELEVANT_FILE_COLUMNS,
                [LabkeyClient.createFilter("FileId", fileId)]
              ),
              mmsClient.getFileMetadata(fileId),
            ]);
            return {
              ...labkeyFileMetadata,
              customMetadata,
              file: { originalPath: labkeyFileMetadata.localFilePath },
            };
          })
        );
      }
      const newUpload = convertUploadRequestsToUploadStateBranch(files, state);

      const actions: AnyAction[] = [];
      // if we have a well, we can get the barcode and other plate info. This will be necessary
      // to display the well editor
      let wellIds: any = Object.values(newUpload.uploadMetadata)[0]?.[
        WELL_ANNOTATION_NAME
      ];
      if (!wellIds) {
        actions.push(setHasNoPlateToUpload(true));
      } else {
        wellIds = castArray(wellIds).map((w: string | number) =>
          parseInt(w + "", 10)
        );
        const plateRelatedActions = await getPlateRelatedActions(
          wellIds,
          labkeyClient,
          mmsClient,
          dispatch
        );
        actions.push(...plateRelatedActions);
      }

      const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
      if (!booleanAnnotationTypeId) {
        throw new Error(
          "Boolean annotation type id not found. Contact Software."
        );
      }

      const { template, uploads } = await getApplyTemplateInfo(
        newUpload.templateId,
        mmsClient,
        dispatch,
        booleanAnnotationTypeId,
        newUpload.uploadMetadata
      );
      const updateUploadsAction = setAppliedTemplate(template, uploads);
      dispatch(
        batchActions([
          ...actions,
          updateUploadsAction,
          openJobAsUploadSucceeded(updateUploadsAction.payload.uploads),
        ])
      );
    } catch (e) {
      dispatch(
        requestFailed(
          "Could not open upload editor: " + e.message,
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      );
    }
    done();
  },
  type: OPEN_JOB_AS_UPLOAD,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<OpenJobAsUploadAction>,
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

export default [openJobAsUploadLogic, resetUploadLogic];
