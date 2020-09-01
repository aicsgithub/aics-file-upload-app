import { basename, dirname, resolve as resolvePath } from "path";

import {
  StartUploadResponse,
  UploadMetadata as AicsFilesUploadMetadata,
} from "@aics/aicsfiles/type-declarations/types";
import {
  castArray,
  flatMap,
  forEach,
  get,
  includes,
  isEmpty,
  isNil,
  map,
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
import { AnnotationType, ColumnType } from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import {
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  getUploadFilePromise,
  mergeChildPaths,
  pivotAnnotations,
  splitTrimAndFilter,
} from "../../util";
import { requestFailed } from "../actions";
import {
  UPLOAD_WORKER_SUCCEEDED,
  UPLOAD_WORKER_ON_PROGRESS,
} from "../constants";
import { setAlert, setErrorAlert } from "../feedback/actions";
import { updateUploadProgressInfo } from "../job/actions";
import { getCurrentJobName, getIncompleteJobIds } from "../job/selectors";
import {
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
} from "../metadata/selectors";
import { openEditFileMetadataTab, selectPage } from "../route/actions";
import { findNextPage } from "../route/constants";
import {
  getSelectPageActions,
  handleGoingToNextPageForNewUpload,
} from "../route/logics";
import { getPage } from "../route/selectors";
import { deselectFiles, stageFiles } from "../selection/actions";
import {
  getSelectedBarcode,
  getSelectedJob,
  getSelectedWellIds,
  getStagedFiles,
} from "../selection/selectors";
import { getLoggedInUser } from "../setting/selectors";
import { setAppliedTemplate } from "../template/actions";
import { getAppliedTemplate } from "../template/selectors";
import {
  AlertType,
  AsyncRequest,
  HTTP_STATUS,
  Page,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependenciesWithAction,
  UploadFile,
  UploadMetadata,
  UploadRowId,
  UploadStateBranch,
  UploadSummaryTableRow,
  Logger,
  UploadProgressInfo,
} from "../types";
import { batchActions } from "../util";

import {
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUploadFailed,
  initiateUploadSucceeded,
  removeUploads,
  replaceUpload,
  retryUploadFailed,
  retryUploadSucceeded,
  saveUploadDraftSuccess,
  updateUpload,
  updateUploads,
  uploadFailed,
  uploadSucceeded,
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
  UPDATE_FILES_TO_ARCHIVE,
  UPDATE_FILES_TO_STORE_ON_ISILON,
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
  UpdateFilesToArchive,
  UpdateFilesToStoreOnIsilon,
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
    const barcode = getSelectedBarcode(state);
    const wellIds = getSelectedWellIds(state);

    if (!barcode) {
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
      barcode,
      wellIds: getSelectedWellIds(state),
    };
    next(batchActions([action, deselectFiles()]));
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

const handleUploadProgressUpdate = (
  e: MessageEvent,
  logger: Logger,
  dispatch: ReduxLogicNextCb,
  jobId: string
) => {
  logger.info(e.data);
  const info = e.data.split(":");
  // worker messages for uploads will look like "upload-progress:111:223" where upload-progress
  // tells us what kind of message this is, 111 is the number of copied bytes and 223 is the total number
  // of bytes to copy for a batch of files
  if (info.length === 3) {
    try {
      const progress: UploadProgressInfo = {
        completedBytes: parseInt(info[1], 10),
        totalBytes: parseInt(info[2]),
      };
      dispatch(updateUploadProgressInfo(jobId, progress));
    } catch (e) {
      logger.error("Could not parse JSON progress info", e);
    }
  } else {
    logger.error("progress info contains insufficient amount of information");
  }
};

const initiateUploadLogic = createLogic({
  process: async (
    {
      ctx,
      fms,
      getApplicationMenu,
      getState,
      getUploadWorker,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<InitiateUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { jobName } = ctx;
    // validate and get jobId
    let startUploadResponse: StartUploadResponse;
    const payload = getUploadPayload(getState());
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
        getIncompleteJobIds(getState()),
        getLoggedInUser(getState())
      )
    );
    const actions = [];
    const currentPage = getPage(getState());
    const nextPage = findNextPage(currentPage, 1);
    if (nextPage) {
      actions.push(
        ...getSelectPageActions(
          logger,
          getState(),
          getApplicationMenu,
          selectPage(currentPage, nextPage)
        )
      );
      dispatch(batchActions(actions));
    }
    const worker = getUploadWorker();
    worker.onmessage = (e: MessageEvent) => {
      const lowerCaseMessage: string = (e.data || "").toLowerCase();
      if (lowerCaseMessage.includes(UPLOAD_WORKER_SUCCEEDED)) {
        dispatch(
          uploadSucceeded(
            jobName,
            startUploadResponse.jobId,
            getIncompleteJobIds(getState())
          )
        );
        done();
      } else if (lowerCaseMessage.includes(UPLOAD_WORKER_ON_PROGRESS)) {
        handleUploadProgressUpdate(
          e,
          logger,
          dispatch,
          startUploadResponse.jobId
        );
      } else {
        logger.info(e.data);
      }
    };
    worker.onerror = (e: ErrorEvent) => {
      const error = `Upload ${jobName} failed: ${e.message}`;
      logger.error(`Upload failed`, e);
      dispatch(
        uploadFailed(
          error,
          jobName,
          startUploadResponse.jobId,
          getIncompleteJobIds(getState())
        )
      );
      done();
    };
    worker.postMessage([
      startUploadResponse,
      payload,
      jobName,
      fms.host,
      fms.port,
      fms.username,
    ]);
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

const cancelUploadLogic = createLogic({
  process: async (
    {
      action,
      jssClient,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<CancelUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const uploadJob: UploadSummaryTableRow = action.payload.job;

    try {
      // TODO FUA-55: we need to do more than this to really stop an upload
      await jssClient.updateJob(uploadJob.jobId, {
        serviceFields: {
          error: "Cancelled by user",
        },
        status: "UNRECOVERABLE",
      });
      dispatch(cancelUploadSucceeded(uploadJob));
    } catch (e) {
      logger.error(`Cancel for jobId=${uploadJob.jobId} failed`, e);
      dispatch(
        cancelUploadFailed(
          uploadJob,
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
    const uploadJob: UploadSummaryTableRow = action.payload.job;
    if (!uploadJob) {
      next(
        setAlert({
          message: "Cannot cancel undefined upload job",
          type: AlertType.ERROR,
        })
      );
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
  process: (
    {
      action,
      fms,
      getRetryUploadWorker,
      getState,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<RetryUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const uploadJob: UploadSummaryTableRow = action.payload.job;
    const worker = getRetryUploadWorker();
    worker.onmessage = (e: MessageEvent) => {
      const lowerCaseMessage = e?.data.toLowerCase();
      if (lowerCaseMessage.includes(UPLOAD_WORKER_SUCCEEDED)) {
        logger.info(`Retry upload ${uploadJob.jobName} succeeded!`);
        dispatch(
          retryUploadSucceeded(uploadJob, getIncompleteJobIds(getState()))
        );
        done();
      } else if (lowerCaseMessage.includes(UPLOAD_WORKER_ON_PROGRESS)) {
        handleUploadProgressUpdate(e, logger, dispatch, uploadJob.jobId);
      } else {
        logger.info(e.data);
      }
    };
    worker.onerror = (e: ErrorEvent) => {
      const error = `Retry upload ${uploadJob.jobName} failed: ${e.message}`;
      logger.error(`Retry for jobId=${uploadJob.jobId} failed`, e);
      dispatch(
        retryUploadFailed(uploadJob, error, getIncompleteJobIds(getState()))
      );
      done();
    };
    const fileNames = uploadJob.serviceFields.files.map(
      ({ file: { originalPath } }: AicsFilesUploadMetadata) => originalPath
    );
    worker.postMessage([
      uploadJob,
      fileNames,
      fms.host,
      fms.port,
      fms.username,
    ]);
  },
  validate: (
    { action }: ReduxLogicTransformDependenciesWithAction<RetryUploadAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const uploadJob: UploadSummaryTableRow = action.payload.job;
    if (isEmpty(uploadJob.serviceFields?.files)) {
      reject(
        setErrorAlert(
          "Not enough information to retry upload. Contact Software."
        )
      );
    } else {
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
          barcode: fileRow.barcode,
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
          barcode: fileRow.barcode,
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
            barcode: fileRow.barcode,
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

const updateFilesToStoreOnIsilonLogic = createLogic({
  transform: (
    {
      action,
    }: ReduxLogicTransformDependenciesWithAction<UpdateFilesToStoreOnIsilon>,
    next: ReduxLogicNextCb
  ) => {
    const updates = map(
      action.payload,
      (shouldBeInLocal: boolean, file: string) =>
        updateUpload(getUploadRowKey({ file }), { shouldBeInLocal })
    );
    next(batchActions(updates));
  },
  type: UPDATE_FILES_TO_STORE_ON_ISILON,
});

const updateFilesToStoreInArchiveLogic = createLogic({
  transform: (
    { action }: ReduxLogicTransformDependenciesWithAction<UpdateFilesToArchive>,
    next: ReduxLogicNextCb
  ) => {
    const updates = map(
      action.payload,
      (shouldBeInArchive: boolean, file: string) =>
        updateUpload(getUploadRowKey({ file }), { shouldBeInArchive })
    );
    next(batchActions(updates));
  },
  type: UPDATE_FILES_TO_ARCHIVE,
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
  process: async (
    {
      ctx,
      getApplicationMenu,
      getState,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<OpenUploadDraftAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(
      batchActions([
        replaceUpload(ctx.filePath, ctx.draft),
        ...handleGoingToNextPageForNewUpload(
          logger,
          getState(),
          getApplicationMenu,
          getPage(ctx.draft)
        ),
      ])
    );

    const { draft } = ctx;
    const topLevelFilesToLoadAgain = getStagedFiles(draft).map((f) =>
      resolvePath(f.path, f.name)
    );
    const filesToLoad: string[] = mergeChildPaths(topLevelFilesToLoadAgain);
    try {
      const uploadFilePromises: Array<Promise<
        UploadFile
      >> = filesToLoad.map((filePath: string) =>
        getUploadFilePromise(basename(filePath), dirname(filePath))
      );
      const uploadFiles = await Promise.all(uploadFilePromises);
      dispatch(stageFiles(uploadFiles));
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
      getApplicationMenu,
      getState,
      jssClient,
      logger,
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
      batchActions([
        editFileMetadataSucceeded(ctx.jobName),
        ...getSelectPageActions(
          logger,
          getState(),
          getApplicationMenu,
          selectPage(Page.AddCustomData, Page.UploadSummary)
        ),
      ])
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
  updateSubImagesLogic,
  updateUploadLogic,
  updateUploadRowsLogic,
  updateFilesToStoreOnIsilonLogic,
  updateFilesToStoreInArchiveLogic,
];
