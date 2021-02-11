import {
  castArray,
  flatMap,
  forEach,
  get,
  includes,
  isEmpty,
  isNil,
  trim,
  values,
} from "lodash";
import { isDate, isMoment } from "moment";
import { createLogic } from "redux-logic";

import {
  CHANNEL_ANNOTATION_NAME,
  LIST_DELIMITER_SPLIT,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";
import {
  StartUploadResponse,
  UploadMetadata as AicsFilesUploadMetadata,
  UploadServiceFields,
} from "../../services/aicsfiles/types";
import {
  FAILED_STATUSES,
  JSSJob,
  JSSJobStatus,
} from "../../services/job-status-client/types";
import { AnnotationType, ColumnType } from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import {
  convertToArray,
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  pivotAnnotations,
  splitTrimAndFilter,
} from "../../util";
import { requestFailed } from "../actions";
import { COPY_PROGRESS_THROTTLE_MS } from "../constants";
import { setErrorAlert } from "../feedback/actions";
import { updateUploadProgressInfo } from "../job/actions";
import {
  getCurrentJobName,
  getJobIdToUploadJobMapGlobal,
} from "../job/selectors";
import {
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
} from "../metadata/selectors";
import { closeUpload, openEditFileMetadataTab } from "../route/actions";
import {
  handleStartingNewUploadJob,
  resetHistoryActions,
} from "../route/logics";
import {
  getSelectedBarcode,
  getSelectedJob,
  getSelectedWellIds,
} from "../selection/selectors";
import { getLoggedInUser } from "../setting/selectors";
import { setAppliedTemplate } from "../template/actions";
import { getAppliedTemplate } from "../template/selectors";
import {
  AsyncRequest,
  HTTP_STATUS,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependenciesWithAction,
  UploadMetadata,
  UploadProgressInfo,
  UploadRowId,
  UploadStateBranch,
  UploadSummaryTableRow,
} from "../types";
import { batchActions, handleUploadProgress } from "../util";

import {
  addUploadFiles,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUploadFailed,
  initiateUploadSucceeded,
  removeUploads,
  replaceUpload,
  saveUploadDraftSuccess,
  updateUploads,
  uploadFailed,
} from "./actions";
import {
  APPLY_TEMPLATE,
  ASSOCIATE_FILES_AND_WELLS,
  CANCEL_UPLOAD,
  getUploadRowKey,
  INITIATE_UPLOAD,
  isSubImageOnlyRow,
  OPEN_UPLOAD_DRAFT,
  RETRY_UPLOAD,
  SAVE_UPLOAD_DRAFT,
  SUBMIT_FILE_METADATA_UPDATE,
  UNDO_FILE_WELL_ASSOCIATION,
  UPDATE_AND_RETRY_UPLOAD,
  UPDATE_SUB_IMAGES,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
} from "./constants";
import {
  getCanSaveUploadDraft,
  getEditFileMetadataRequests,
  getFileIdsToDelete,
  getUpload,
  getUploadPayload,
} from "./selectors";
import {
  ApplyTemplateAction,
  AssociateFilesAndWellsAction,
  CancelUploadAction,
  InitiateUploadAction,
  OpenUploadDraftAction,
  RetryUploadAction,
  SaveUploadDraftAction,
  SubmitFileMetadataUpdateAction,
  UndoFileWellAssociationAction,
  UpdateAndRetryUploadAction,
  UpdateSubImagesAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
} from "./types";

const associateFilesAndWellsLogic = createLogic({
  type: ASSOCIATE_FILES_AND_WELLS,
  validate: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<AssociateFilesAndWellsAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { rowIds } = action.payload;
    if (isEmpty(action.payload.rowIds)) {
      reject(
        setErrorAlert("Cannot associate files and wells: No files selected")
      );
      return;
    }

    const rowWithChannel = rowIds.find((id: UploadRowId) => id.channelId);
    if (rowWithChannel) {
      reject(setErrorAlert("Cannot associate wells with a channel row"));
    }

    const state = getState();
    const wellIds = getSelectedWellIds(state);

    if (!getSelectedBarcode(state)) {
      reject(
        setErrorAlert("Cannot associate files and wells: No plate selected")
      );
      return;
    }

    if (isEmpty(wellIds)) {
      reject(
        setErrorAlert("Cannot associate files and wells: No wells selected")
      );
      return;
    }

    action.payload = {
      ...action.payload,
      wellIds,
    };
    next(action);
  },
});

const undoFileWellAssociationLogic = createLogic({
  type: UNDO_FILE_WELL_ASSOCIATION,
  validate: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<UndoFileWellAssociationAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const state = getState();
    const wellIds = isEmpty(action.payload.wellIds)
      ? getSelectedWellIds(state)
      : action.payload.wellIds;
    if (isEmpty(wellIds)) {
      reject(
        setErrorAlert(
          "Cannot undo file and well associations: No wells selected"
        )
      );
      return;
    }

    action.payload = {
      ...action.payload,
      wellIds,
    };
    next(action);
  },
});

const applyTemplateLogic = createLogic({
  process: async (
    {
      action,
      getState,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<ApplyTemplateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const templateId = action.payload;
    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!booleanAnnotationTypeId) {
      dispatch(
        requestFailed(
          "Boolean annotation type id not found. Contact Software.",
          AsyncRequest.GET_TEMPLATE
        )
      );
      done();
      return;
    }
    try {
      const { template, uploads } = await getApplyTemplateInfo(
        templateId,
        mmsClient,
        dispatch,
        booleanAnnotationTypeId,
        getUpload(getState()),
        getAppliedTemplate(getState())
      );
      dispatch(setAppliedTemplate(template, uploads));
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not apply template: ${get(
            e,
            ["response", "data", "error"],
            e.message
          )}`,
          AsyncRequest.GET_TEMPLATE
        )
      );
    }
    done();
  },
  type: APPLY_TEMPLATE,
});

const initiateUploadLogic = createLogic({
  process: async (
    {
      ctx,
      fms,
      getState,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<InitiateUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { jobName } = ctx;
    // validate and get jobId
    let startUploadResponse: StartUploadResponse;
    const payload = getUploadPayload(getState());
    const user = getLoggedInUser(getState());
    try {
      startUploadResponse = await fms.validateMetadataAndGetUploadDirectory(
        payload,
        jobName
      );
    } catch (e) {
      // This will show an error on the last page of the upload wizard
      dispatch(
        initiateUploadFailed(
          jobName,
          e.message || "Validation failed for upload"
        )
      );
      done();
      return;
    }

    dispatch(
      initiateUploadSucceeded(
        jobName,
        startUploadResponse.jobId,
        getLoggedInUser(getState())
      )
    );
    dispatch(batchActions([...resetHistoryActions]));
    try {
      await fms.uploadFiles(
        startUploadResponse,
        payload,
        jobName,
        user,
        handleUploadProgress(
          Object.keys(payload),
          (progress: UploadProgressInfo) =>
            dispatch(
              updateUploadProgressInfo(startUploadResponse.jobId, progress)
            )
        ),
        COPY_PROGRESS_THROTTLE_MS
      );
      done();
    } catch (e) {
      const error = `Upload ${jobName} failed: ${e.message}`;
      logger.error(`Upload failed`, e);
      dispatch(uploadFailed(error, jobName));
      done();
    }
  },
  type: INITIATE_UPLOAD,
  validate: (
    {
      action,
      ctx,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<InitiateUploadAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    ctx.jobName = getCurrentJobName(getState());
    if (!ctx.jobName) {
      reject(setErrorAlert("Nothing to upload"));
      return;
    }

    next({
      ...action,
      payload: {
        ...action.payload,
        jobName: ctx.jobName,
      },
      writeToStore: true,
    });
  },
  warnTimeout: 0,
});

export const cancelUploadLogic = createLogic({
  process: async (
    {
      action,
      fms,
      getState,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<CancelUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const uploadJob = action.payload;
    const jobIdsToFail = new Set<string>();
    if (uploadJob.serviceFields?.originalJobId) {
      jobIdsToFail.add(uploadJob.serviceFields?.originalJobId);
      const jobIdToJobMap = getJobIdToUploadJobMapGlobal(getState());
      const originalJob = jobIdToJobMap.get(
        uploadJob.serviceFields.originalJobId
      );
      if (originalJob) {
        convertToArray(originalJob.serviceFields?.replacementJobIds).forEach(
          (jobId) => {
            jobIdsToFail.add(jobId);
          }
        );
      }
    } else {
      jobIdsToFail.add(uploadJob.jobId);
    }

    try {
      // TODO FUA-55: we need to do more than this to really stop an upload
      await Promise.all(
        Array.from(jobIdsToFail).map((jobId) =>
          fms.failUpload(
            jobId,
            uploadJob.user,
            uploadJob.childIds,
            "Cancelled by user",
            JSSJobStatus.FAILED,
            {
              cancelled: true,
            }
          )
        )
      );

      dispatch(cancelUploadSucceeded(uploadJob.jobName || ""));
    } catch (e) {
      logger.error(`Cancel upload failed`, e);
      dispatch(
        cancelUploadFailed(
          uploadJob.jobName || "",
          `Cancel upload ${uploadJob.jobName} failed: ${e.message}`
        )
      );
    }
    done();
  },
  type: CANCEL_UPLOAD,
  validate: async (
    {
      action,
      dialog,
    }: ReduxLogicTransformDependenciesWithAction<CancelUploadAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const uploadJob = action.payload;
    if (!uploadJob) {
      reject(setErrorAlert("Cannot cancel undefined upload job"));
    } else {
      const { response: buttonIndex } = await dialog.showMessageBox({
        buttons: ["Cancel", "Yes"],
        cancelId: 0,
        defaultId: 1,
        message:
          "If you stop this upload, you'll have to start the upload process for these files from the beginning again.",
        title: "Danger!",
        type: "warning",
      });
      if (buttonIndex === 1) {
        next(action);
      } else {
        reject({ type: "ignore" });
      }
    }
  },
});

const retryUploadLogic = createLogic({
  process: async (
    {
      action,
      ctx,
      fms,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<RetryUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const uploadJob: JSSJob<UploadServiceFields> = action.payload;
    const jobName = uploadJob.jobName || "";
    const fileNames = ctx.files.map(
      ({ file: { originalPath } }: AicsFilesUploadMetadata) => originalPath
    );
    try {
      await fms.retryUpload(
        uploadJob,
        handleUploadProgress(fileNames, (progress: UploadProgressInfo) =>
          dispatch(updateUploadProgressInfo(uploadJob.jobId, progress))
        ),
        COPY_PROGRESS_THROTTLE_MS
      );
      done();
    } catch (e) {
      const error = `Retry upload ${jobName} failed: ${e.message}`;
      logger.error(`Retry for jobId=${uploadJob.jobId} failed`, e);
      dispatch(uploadFailed(error, jobName));
      done();
    }
  },
  validate: (
    {
      action,
      ctx,
      getState,
      logger,
    }: ReduxLogicTransformDependenciesWithAction<RetryUploadAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const uploadJob: JSSJob<UploadServiceFields> = action.payload;
    if (isEmpty(uploadJob.serviceFields?.files)) {
      reject(
        setErrorAlert(
          "Not enough information to retry upload. Contact Software."
        )
      );
    } else if (uploadJob.serviceFields?.originalJobId) {
      logger.info(
        `This upload job replaced the job ${uploadJob.serviceFields?.originalJobId}. Finding the original to retry.`
      );
      let currJob:
        | UploadSummaryTableRow
        | JSSJob<UploadServiceFields>
        | undefined = uploadJob;
      const jobIdToJobMap = getJobIdToUploadJobMapGlobal(getState());
      while (currJob?.serviceFields?.originalJobId) {
        currJob = jobIdToJobMap.get(currJob?.serviceFields?.originalJobId);
        logger.info(`Now the current job is ${currJob?.jobId}`);
      }
      if (!currJob) {
        reject(setErrorAlert("Could not find original upload to retry"));
      } else {
        action.payload = currJob;
        ctx.files =
          currJob.serviceFields?.files || uploadJob.serviceFields.files;
        next(action);
      }
    } else {
      ctx.files = uploadJob.serviceFields?.files;
      next(action);
    }
  },
  type: RETRY_UPLOAD,
  warnTimeout: 0,
});

const getSubImagesAndKey = (
  positionIndexes: number[],
  scenes: number[],
  subImageNames: string[]
) => {
  let subImages: Array<string | number> = positionIndexes;
  let subImageKey: keyof UploadMetadata = "positionIndex";
  if (isEmpty(subImages)) {
    subImages = scenes;
    subImageKey = "scene";
  }
  if (isEmpty(subImages)) {
    subImages = subImageNames;
    subImageKey = "subImageName";
  }
  subImages = subImages || [];
  return {
    subImageKey,
    subImages,
  };
};

// This handles the event where a user adds subimages in the form of positions/scenes/names (only one type allowed)
// and/or channels.
// When this happens we want to:
// (1) delete rows representing subimages and channels that we no longer care about
// (2) create new rows for subimages and channels that are new
// (3) remove wells from file row if a sub image was added.
// For rows containing subimage or channel information that was previously there, we do nothing, as to save
// anything that user has entered for that row.
const updateSubImagesLogic = createLogic({
  type: UPDATE_SUB_IMAGES,
  validate: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<UpdateSubImagesAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const {
      channelIds,
      positionIndexes,
      row: fileRow,
      scenes,
      subImageNames,
    } = action.payload;
    let notEmptySubImageParams = 0;
    if (!isEmpty(positionIndexes)) {
      notEmptySubImageParams++;
    }

    if (!isEmpty(scenes)) {
      notEmptySubImageParams++;
    }

    if (!isEmpty(subImageNames)) {
      notEmptySubImageParams++;
    }

    if (notEmptySubImageParams > 1) {
      reject(
        setErrorAlert(
          "Could not update sub images. Found more than one type of subImage in request"
        )
      );
      return;
    }

    const { subImageKey, subImages } = getSubImagesAndKey(
      positionIndexes,
      scenes,
      subImageNames
    );
    const update: Partial<UploadStateBranch> = {};
    const workflows = fileRow[WORKFLOW_ANNOTATION_NAME];

    const uploads = getUpload(getState());
    const existingUploadsForFile: UploadMetadata[] = values(uploads).filter(
      (u) => u.file === fileRow.file
    );

    const template = getAppliedTemplate(getState());

    if (!template) {
      next(
        setErrorAlert(
          "Could not get applied template while attempting to update file sub images. Contact Software."
        )
      );
      return;
    }

    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!booleanAnnotationTypeId) {
      next(
        setErrorAlert("Could not get boolean annotation type. Contact Software")
      );
      return;
    }

    const additionalAnnotations = pivotAnnotations(
      template.annotations,
      booleanAnnotationTypeId
    );

    // If there are subimages for a file, remove the well associations from the file row
    // Also add channels as an annotation
    if (!isEmpty(subImages)) {
      update[fileRow.key] = {
        ...uploads[fileRow.key],
        [WELL_ANNOTATION_NAME]: [],
        ...(channelIds.length && {
          [CHANNEL_ANNOTATION_NAME]: channelIds,
        }),
      };
    }

    // add channel rows that are new
    const oldChannelIds = fileRow.channelIds || [];
    channelIds
      .filter((c: string) => !includes(oldChannelIds, c))
      .forEach((channelId: string) => {
        const key = getUploadRowKey({
          file: fileRow.file,
          channelId,
        });
        update[key] = {
          channelId,
          file: fileRow.file,
          key,
          [NOTES_ANNOTATION_NAME]: [],
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
          [WELL_ANNOTATION_NAME]: [],
          [WORKFLOW_ANNOTATION_NAME]: workflows,
          ...additionalAnnotations,
        };
      });

    // add uploads that are new
    subImages.forEach((subImageValue: string | number) => {
      const matchingSubImageRow = existingUploadsForFile
        .filter(isSubImageOnlyRow)
        .find((u: UploadMetadata) => u[subImageKey] === subImageValue);

      if (!matchingSubImageRow) {
        const subImageOnlyRowKey = getUploadRowKey({
          file: fileRow.file,
          [subImageKey]: subImageValue,
        });
        update[subImageOnlyRowKey] = {
          channelId: undefined,
          file: fileRow.file,
          key: subImageOnlyRowKey,
          [NOTES_ANNOTATION_NAME]: [],
          [WELL_ANNOTATION_NAME]: [],
          [WORKFLOW_ANNOTATION_NAME]: workflows,
          [subImageKey]: subImageValue,
          ...additionalAnnotations,
        };
      }

      channelIds.forEach((channelId: string) => {
        const matchingChannelRow = existingUploadsForFile.find(
          (u) =>
            u.channelId &&
            u.channelId === channelId &&
            u[subImageKey] === subImageValue
        );

        if (!matchingChannelRow) {
          const key = getUploadRowKey({
            channelId: channelId,
            file: fileRow.file,
            [subImageKey]: subImageValue,
          });
          update[key] = {
            channelId,
            file: fileRow.file,
            key,
            [NOTES_ANNOTATION_NAME]: [],
            [WELL_ANNOTATION_NAME]: [],
            [WORKFLOW_ANNOTATION_NAME]: workflows,
            [subImageKey]: subImageValue,
            ...additionalAnnotations,
          };
        }
      });
    });

    // delete the uploads that don't exist anymore
    const rowKeysToDelete = existingUploadsForFile
      .filter(
        (u) =>
          (!isNil(u.positionIndex) &&
            !includes(positionIndexes, u.positionIndex)) ||
          (!isNil(u.scene) && !includes(scenes, u.scene)) ||
          (!isNil(u.subImageName) &&
            !includes(subImageNames, u.subImageName)) ||
          (!isNil(u.channelId) && !includes(channelIds, u.channelId))
      )
      .map(
        ({
          file,
          positionIndex,
          channelId,
          scene,
          subImageName,
        }: UploadMetadata) =>
          getUploadRowKey({
            channelId,
            file,
            positionIndex,
            scene,
            subImageName,
          })
      );
    next(batchActions([updateUploads(update), removeUploads(rowKeysToDelete)]));
  },
});

const parseStringArray = (input: string[]): string[] =>
  flatMap(input, splitTrimAndFilter);

const parseNumberArray = (input: string[]): number[] => {
  return input.reduce((filtered: number[], next: string) => {
    return [
      ...filtered,
      ...`${next}`
        .split(LIST_DELIMITER_SPLIT)
        .map((v) => Number(trim(v)))
        .filter((v) => !Number.isNaN(v)),
    ];
  }, []);
};

// antd's DatePicker passes a moment object rather than Date so we convert back here
// sometimes the input is invalid and does not get converted to a moment object so
// we're typing it as any
const convertDatePickerValueToDate = (d: any) => {
  if (isDate(d)) {
    return d;
  } else if (isMoment(d)) {
    return d.toDate();
  } else {
    return undefined;
  }
};

// Here we take care of custom inputs that handle arrays for strings and numbers.
// If we can create a valid array from the text of the input, we'll transform it into an array
// if not, we pass the value untouched to the reducer.
// Additionally we take care of converting moment dates back to dates.
function formatUpload(
  upload: Partial<UploadMetadata>,
  template: Template,
  annotationTypes: AnnotationType[]
) {
  const formattedUpload: Partial<UploadMetadata> = {};
  forEach(upload, (value: any, key: string) => {
    const annotation = template.annotations.find((a) => a.name === key);

    if (annotation) {
      const annotationType = annotationTypes.find(
        (at) => at.annotationTypeId === annotation.annotationTypeId
      );

      if (annotationType) {
        const type = annotationType.name;
        const endsWithComma = trim(value).endsWith(",");

        if (type === ColumnType.DATETIME || type === ColumnType.DATE) {
          value = (value ? castArray(value) : [])
            .map(convertDatePickerValueToDate)
            .filter((d: any) => !isNil(d));
        } else if (type === ColumnType.NUMBER && !endsWithComma) {
          value = parseNumberArray(
            castArray(value).filter((v) => !isNil(v) && v !== "")
          );
        } else if (type === ColumnType.TEXT && !endsWithComma) {
          value = parseStringArray(
            castArray(value).filter((v) => !isNil(v) && v !== "")
          );
        }
      }
    }

    formattedUpload[key] = value;
  });

  return formattedUpload;
}

const updateUploadLogic = createLogic({
  transform: (
    {
      action,
      getState,
      logger,
    }: ReduxLogicTransformDependenciesWithAction<UpdateUploadAction>,
    next: ReduxLogicNextCb
  ) => {
    const { upload } = action.payload;
    const state = getState();
    const template = getAppliedTemplate(state);
    const annotationTypes = getAnnotationTypes(state);

    if (!template || !annotationTypes) {
      next(action);
    } else {
      try {
        const formattedUpload = formatUpload(upload, template, annotationTypes);
        next({
          ...action,
          payload: {
            ...action.payload,
            upload: formattedUpload,
          },
        });
      } catch (e) {
        logger.error(
          "Something went wrong while updating metadata: ",
          e.message
        );
      }
    }
  },
  type: UPDATE_UPLOAD,
});

const updateUploadRowsLogic = createLogic({
  transform: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<UpdateUploadRowsAction>,
    next: ReduxLogicNextCb
  ) => {
    const { uploadKeys, metadataUpdate } = action.payload;
    const state = getState();
    const template = getAppliedTemplate(state);
    const annotationTypes = getAnnotationTypes(state);

    // Format update if template and annotation types are present
    const formattedUpdate =
      template && annotationTypes
        ? formatUpload(metadataUpdate, template, annotationTypes)
        : metadataUpdate;

    const updatedAction: UpdateUploadRowsAction = {
      ...action,
      payload: {
        metadataUpdate: formattedUpdate,
        uploadKeys,
      },
    };
    next(updatedAction);
  },
  type: UPDATE_UPLOAD_ROWS,
});

// Saves what is currently in the upload wizard tab whether a new upload in progress or
// a draft that was saved previously
const saveUploadDraftLogic = createLogic({
  type: SAVE_UPLOAD_DRAFT,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<SaveUploadDraftAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, getState } = deps;
    try {
      const { cancelled, filePath } = await ensureDraftGetsSaved(
        deps,
        getCanSaveUploadDraft(getState()),
        getCurrentUploadFilePath(getState()),
        true
      );
      if (cancelled || !filePath) {
        // don't let this action get to the reducer
        reject({ type: "ignore" });
        return;
      }
      const currentUploadFilePath = action.payload ? filePath : undefined;
      next(saveUploadDraftSuccess(currentUploadFilePath));
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }
  },
});

const openUploadLogic = createLogic({
  process: (
    {
      ctx,
      logger,
      getApplicationMenu,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<OpenUploadDraftAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(
      batchActions([
        replaceUpload(ctx.filePath, ctx.draft),
        ...handleStartingNewUploadJob(logger, getState(), getApplicationMenu),
      ])
    );

    const { draft } = ctx;
    const uploadFilesFromDraft = getUpload(draft);
    try {
      dispatch(addUploadFiles(Object.values(uploadFilesFromDraft)));
    } catch (e) {
      dispatch(setErrorAlert(`Encountered error while resolving files: ${e}`));
    }

    done();
  },
  type: OPEN_UPLOAD_DRAFT,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<OpenUploadDraftAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, ctx, dialog, getState, readFile } = deps;
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

    try {
      const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
      });
      if (filePaths && filePaths[0]) {
        ctx.filePath = filePaths[0];
      } else {
        // user cancelled
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(`Could not open file: ${e.message}`));
    }

    try {
      ctx.draft = JSON.parse((await readFile(ctx.filePath, "utf8")) as string);
      const selectedJob = getSelectedJob(ctx.draft);
      if (selectedJob) {
        // If a selectedJob exists on the draft, we know that the upload has been submitted before
        // and we actually want to edit it. This will go through the openEditFileMetadataTab logics instead.
        reject(openEditFileMetadataTab(selectedJob));
      } else {
        next(action);
      }
    } catch (e) {
      reject(setErrorAlert(`Could not open draft: ${e.message}`));
      return;
    }
  },
});

const submitFileMetadataUpdateLogic = createLogic({
  process: async (
    {
      ctx,
      getState,
      jssClient,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<SubmitFileMetadataUpdateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const fileIdsToDelete: string[] = getFileIdsToDelete(getState());

    // We delete files in series so that we can ignore the files that have already been deleted
    for (const fileId of fileIdsToDelete) {
      try {
        await mmsClient.deleteFileMetadata(fileId, true);
      } catch (e) {
        // ignoring not found to keep this idempotent
        if (e?.status !== HTTP_STATUS.NOT_FOUND) {
          dispatch(
            editFileMetadataFailed(
              `Could not delete file ${fileId}: ${
                e?.response?.data?.error || e.message
              }`,
              ctx.jobName
            )
          );
          done();
          return;
        }
      }
    }

    try {
      await jssClient.updateJob(
        ctx.selectedJobId,
        { serviceFields: { deletedFileIds: fileIdsToDelete } },
        true
      );
    } catch (e) {
      dispatch(
        editFileMetadataFailed(
          `Could not update upload with deleted fileIds: ${
            e?.response?.data?.error || e.message
          }`,
          ctx.jobName
        )
      );
    }

    const editFileMetadataRequests = getEditFileMetadataRequests(getState());
    try {
      await Promise.all(
        editFileMetadataRequests.map(({ fileId, request }) =>
          mmsClient.editFileMetadata(fileId, request)
        )
      );
    } catch (e) {
      const message = e?.response?.data?.error || e.message;
      dispatch(
        editFileMetadataFailed("Could not edit files: " + message, ctx.jobName)
      );
      done();
      return;
    }

    dispatch(
      batchActions([editFileMetadataSucceeded(ctx.jobName), closeUpload()])
    );
    done();
  },
  type: SUBMIT_FILE_METADATA_UPDATE,
  validate: (
    {
      action,
      ctx,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<
      SubmitFileMetadataUpdateAction
    >,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const selectedJob = getSelectedJob(getState());
    const jobName = getCurrentJobName(getState());
    if (!selectedJob || !jobName) {
      reject(setErrorAlert("Nothing found to update"));
      return;
    }
    if (!getAppliedTemplate(getState())) {
      reject(
        setErrorAlert("Cannot submit update: no template has been applied.")
      );
    }
    ctx.selectedJobId = selectedJob.jobId;
    ctx.jobName = jobName;
    next({
      ...action,
      payload: jobName,
    });
  },
});

const updateAndRetryUploadLogic = createLogic({
  process: async (
    {
      ctx,
      fms,
      jssClient,
    }: ReduxLogicProcessDependenciesWithAction<UpdateAndRetryUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { selectedJob: originalJob } = ctx;
    const { files, jobName } = ctx;
    const requestType = `${AsyncRequest.UPLOAD}-${jobName}`;

    let selectedJob = originalJob;
    try {
      selectedJob = await jssClient.updateJob(
        originalJob.jobId,
        {
          jobName,
          serviceFields: {
            files,
          },
        },
        false
      );
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not update and retry upload: ${e.message}`,
          requestType
        )
      );
      done();
      return;
    }

    // close the tab to let user watch progress from upload summary page
    dispatch(closeUpload());

    try {
      await fms.retryUpload(selectedJob);
    } catch (e) {
      dispatch(
        requestFailed(
          `Retry upload ${jobName} failed: ${e.message}`,
          requestType
        )
      );

      // attempt to revert job back to previous state
      try {
        await jssClient.updateJob(originalJob.jobId, {
          jobName: originalJob.jobName,
          serviceFields: {
            files: originalJob.serviceFields.files,
          },
        });
      } catch (e) {
        dispatch(
          setErrorAlert(
            `Unable to revert upload back to original state: ${e.message}`
          )
        );
      }
    } finally {
      done();
    }
  },
  validate: (
    {
      action,
      ctx,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<UpdateAndRetryUploadAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    ctx.selectedJob = getSelectedJob(getState());
    ctx.jobName = getCurrentJobName(getState());
    if (!ctx.selectedJob) {
      reject(setErrorAlert("No upload selected"));
    } else if (FAILED_STATUSES.includes(ctx.selectedJob.status)) {
      try {
        // get this information before the tab closes and everything gets cleared out
        ctx.files = Object.values(getUploadPayload(getState()));
        next({
          ...action,
          payload: ctx.jobName,
        });
      } catch (e) {
        reject(setErrorAlert(e.message));
      }
    } else {
      reject(setErrorAlert("Selected job is not retryable"));
    }
  },
  type: UPDATE_AND_RETRY_UPLOAD,
});

export default [
  applyTemplateLogic,
  associateFilesAndWellsLogic,
  cancelUploadLogic,
  initiateUploadLogic,
  openUploadLogic,
  retryUploadLogic,
  saveUploadDraftLogic,
  submitFileMetadataUpdateLogic,
  undoFileWellAssociationLogic,
  updateAndRetryUploadLogic,
  updateSubImagesLogic,
  updateUploadLogic,
  updateUploadRowsLogic,
];
