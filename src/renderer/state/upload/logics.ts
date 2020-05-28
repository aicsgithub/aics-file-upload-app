import { basename, dirname, resolve as resolvePath } from "path";

import {
  castArray,
  flatMap,
  forEach,
  includes,
  isEmpty,
  isNil,
  map,
  trim,
  uniq,
  values,
  without,
} from "lodash";
import { isDate, isMoment } from "moment";
import { createLogic } from "redux-logic";

import { INCOMPLETE_JOB_IDS_KEY } from "../../../shared/constants";
import {
  LIST_DELIMITER_SPLIT,
  NOTES_ANNOTATION_NAME,
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";
import { getCurrentUploadName } from "../../containers/App/selectors";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import {
  getSetAppliedTemplateAction,
  getUploadFilePromise,
  mergeChildPaths,
  pivotAnnotations,
  splitTrimAndFilter,
} from "../../util";
import {
  clearUploadError,
  closeModal,
  openModal,
  removeRequestFromInProgress,
  setAlert,
  setDeferredAction,
  setErrorAlert,
  setUploadError,
} from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import {
  startJobPoll,
  stopJobPoll,
  updateIncompleteJobIds,
} from "../job/actions";
import { getCurrentJobName, getIncompleteJobIds } from "../job/selectors";
import { setCurrentUpload } from "../metadata/actions";
import { getAnnotationTypes, getCurrentUpload } from "../metadata/selectors";
import { Channel, CurrentUpload } from "../metadata/types";
import { selectPage } from "../route/actions";
import { findNextPage } from "../route/constants";
import { getSelectPageActions } from "../route/logics";
import { getPage } from "../route/selectors";
import { Page } from "../route/types";
import { deselectFiles, stageFiles } from "../selection/actions";
import {
  getSelectedBarcode,
  getSelectedJob,
  getSelectedWellIds,
  getStagedFiles,
} from "../selection/selectors";
import { UploadFile } from "../selection/types";
import { getAppliedTemplate } from "../template/selectors";
import { AnnotationType, ColumnType, Template } from "../template/types";
import {
  HTTP_STATUS,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { batchActions } from "../util";

import {
  cancelUploadFailed,
  cancelUploadSucceeded,
  clearUploadDraft,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  removeUploads,
  replaceUpload,
  retryUploadFailed,
  retryUploadSucceeded,
  updateUpload,
  updateUploads,
} from "./actions";
import {
  APPLY_TEMPLATE,
  ASSOCIATE_FILES_AND_WELLS,
  CANCEL_UPLOAD,
  getUploadDraftKey,
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
  getCreateFileMetadataRequests,
  getFileIdsToDelete,
  getUpload,
  getUploadPayload,
} from "./selectors";
import {
  UpdateUploadRowsAction,
  UploadMetadata,
  UploadRowId,
  UploadStateBranch,
} from "./types";

const associateFilesAndWellsLogic = createLogic({
  type: ASSOCIATE_FILES_AND_WELLS,
  validate: (
    { action, getState }: ReduxLogicTransformDependencies,
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
      barcode: getSelectedBarcode(state),
      wellIds: getSelectedWellIds(state),
    };
    next(batchActions([action, deselectFiles()]));
  },
});

const undoFileWellAssociationLogic = createLogic({
  type: UNDO_FILE_WELL_ASSOCIATION,
  validate: (
    { action, getState }: ReduxLogicTransformDependencies,
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
    { action, getState, mmsClient }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const templateId = action.payload;
    try {
      const setAppliedTemplateAction = await getSetAppliedTemplateAction(
        templateId,
        getState,
        mmsClient,
        dispatch
      );
      dispatch(setAppliedTemplateAction);
    } catch (e) {
      dispatch(
        batchActions([
          setErrorAlert("Could not apply template: " + e.message),
          removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE),
        ])
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
      getApplicationMenu,
      getState,
      logger,
    }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { jobName } = ctx;
    // validate and get jobId
    let startUploadResponse;
    try {
      startUploadResponse = await fms.validateMetadataAndGetUploadDirectory(
        getUploadPayload(getState())
      );
      const updatedIncompleteJobIds = uniq([
        ...getIncompleteJobIds(getState()),
        startUploadResponse.jobId,
      ]);
      dispatch(updateIncompleteJobIds(updatedIncompleteJobIds));
    } catch (e) {
      dispatch(
        setUploadError(jobName, e.message || "Validation failed for upload")
      );
      done();
      return;
    }

    dispatch(startJobPoll());
    try {
      const payload = getUploadPayload(getState());
      const incompleteJobIds = getIncompleteJobIds(getState());
      const updatedIncompleteJobIds = [
        ...incompleteJobIds,
        startUploadResponse.jobId,
      ];

      const currentPage = getPage(getState());
      const nextPage = findNextPage(currentPage, 1);
      const actions = [
        updateIncompleteJobIds(updatedIncompleteJobIds),
        clearUploadError(),
      ];
      if (nextPage) {
        actions.push(
          ...getSelectPageActions(
            logger,
            getState(),
            getApplicationMenu,
            selectPage(currentPage, nextPage)
          )
        );
      }

      let updates: { [key: string]: any } = {
        [INCOMPLETE_JOB_IDS_KEY]: updatedIncompleteJobIds,
      };
      const currentUpload = getCurrentUpload(getState());
      if (currentUpload) {
        // clear out upload draft so it doesn't get re-submitted on accident
        updates = {
          ...updates,
          [getUploadDraftKey(
            currentUpload.name,
            currentUpload.created
          )]: undefined,
        };
      }

      dispatch({
        ...batchActions(actions),
        updates,
        writeToStore: true,
      });
      await fms.uploadFiles(startUploadResponse, payload, jobName);
    } catch (e) {
      const error = `Upload Failed: ${e.message}`;
      logger.error(error);
      dispatch(
        batchActions([
          setErrorAlert(error),
          updateIncompleteJobIds(
            without(getIncompleteJobIds(getState()), startUploadResponse.jobId)
          ),
        ])
      );
    }

    // hopefully give job queries a chance to catch up
    setTimeout(() => {
      dispatch(stopJobPoll());
      done();
    }, 2000);
  },
  type: INITIATE_UPLOAD,
  validate: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    ctx.jobName = getCurrentJobName(getState());
    if (!ctx.jobName) {
      reject({ type: "ignore" });
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
});

const cancelUploadLogic = createLogic({
  process: async (
    { action, jssClient, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(startJobPoll());
    const uploadJob: UploadSummaryTableRow = action.payload;

    try {
      await jssClient.updateJob(uploadJob.jobId, {
        serviceFields: {
          error: "Cancelled by user",
        },
        status: "UNRECOVERABLE",
      });
      // TODO: Go through FSS?
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
    dispatch(stopJobPoll());
    done();
  },
  type: CANCEL_UPLOAD,
  validate: (
    { action, dialog }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const uploadJob: UploadSummaryTableRow = action.payload;
    if (!uploadJob) {
      next(
        setAlert({
          message: "Cannot cancel undefined upload job",
          type: AlertType.ERROR,
        })
      );
    } else {
      dialog.showMessageBox(
        {
          buttons: ["Cancel", "Yes"],
          cancelId: 0,
          defaultId: 1,
          message:
            "If you stop this upload, you'll have to start the upload process for these files from the beginning again.",
          title: "Danger!",
          type: "warning",
        },
        (response: number) => {
          if (response === 1) {
            next(action);
          } else {
            reject({ type: "ignore" });
          }
        }
      );
    }
  },
});

const retryUploadLogic = createLogic({
  process: async (
    { action, fms, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(startJobPoll());
    const uploadJob: UploadSummaryTableRow = action.payload;
    try {
      await fms.retryUpload(uploadJob);
      dispatch(retryUploadSucceeded(uploadJob));
    } catch (e) {
      const error = `Retry upload ${uploadJob.jobName} failed: ${e.message}`;
      logger.error(`Retry for jobId=${uploadJob.jobId} failed`, e);
      dispatch(retryUploadFailed(uploadJob, error));
    }
    dispatch(stopJobPoll());
    done();
  },
  transform: (
    { action }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const uploadJob: UploadSummaryTableRow = action.payload;
    if (!uploadJob) {
      next(setErrorAlert("Cannot retry undefined upload job"));
    } else {
      next(action);
    }
  },
  type: RETRY_UPLOAD,
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
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const {
      channels,
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

    const channelIds = channels.map((c: Channel) => c.channelId);
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

    const additionalAnnotations = pivotAnnotations(template.annotations);

    // If there are subimages for a file, remove the well associations from the file row
    if (!isEmpty(subImages)) {
      update[fileRow.key] = {
        ...uploads[fileRow.key],
        [WELL_ANNOTATION_NAME]: [],
      };
    }

    // add channel rows that are new
    const oldChannelIds = fileRow.channelIds || [];
    channels
      .filter((c: Channel) => !includes(oldChannelIds, c.channelId))
      .forEach((channel: Channel) => {
        const key = getUploadRowKey({
          file: fileRow.file,
          channelId: channel.channelId,
        });
        update[key] = {
          barcode: fileRow.barcode,
          channel,
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
          channel: undefined,
          file: fileRow.file,
          key: subImageOnlyRowKey,
          [NOTES_ANNOTATION_NAME]: [],
          [WELL_ANNOTATION_NAME]: [],
          [WORKFLOW_ANNOTATION_NAME]: workflows,
          [subImageKey]: subImageValue,
          ...additionalAnnotations,
        };
      }

      channels.forEach((channel: Channel) => {
        const matchingChannelRow = existingUploadsForFile.find(
          (u) =>
            u.channel &&
            u.channel.channelId === channel.channelId &&
            u[subImageKey] === subImageValue
        );

        if (!matchingChannelRow) {
          const key = getUploadRowKey({
            channelId: channel.channelId,
            file: fileRow.file,
            [subImageKey]: subImageValue,
          });
          update[key] = {
            barcode: fileRow.barcode,
            channel,
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
          (!isNil(u.channel) && !includes(channelIds, u.channel.channelId))
      )
      .map(
        ({
          file,
          positionIndex,
          channel,
          scene,
          subImageName,
        }: UploadMetadata) =>
          getUploadRowKey({
            channelId: channel ? channel.channelId : undefined,
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
    { action, getState, logger }: ReduxLogicTransformDependencies,
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
    { action }: ReduxLogicTransformDependencies,
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
    { action }: ReduxLogicTransformDependencies,
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
  validate: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const upload = getUpload(getState());
    if (isEmpty(upload)) {
      reject(setErrorAlert("Nothing to save"));
      return;
    }

    const draftName = trim(action.payload) || getCurrentUploadName(getState());
    if (!draftName) {
      reject(setErrorAlert("Draft name cannot be empty"));
      return;
    }

    const currentUpload = getCurrentUpload(getState()); // this is populated if the draft was saved previously
    const now = new Date();
    const created = currentUpload ? currentUpload.created : now;
    const draftKey: string | undefined = getUploadDraftKey(draftName, created);

    const metadata: CurrentUpload = {
      created,
      modified: now,
      name: draftName,
    };

    next({
      updates: {
        [draftKey]: { metadata, state: getState() },
        ...clearUploadDraft().updates,
      },
      writeToStore: true,
      ...setCurrentUpload(metadata),
    });
  },
});

const openUploadLogic = createLogic({
  process: async (
    { ctx }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { draft } = ctx;
    const topLevelFilesToLoadAgain = getStagedFiles(draft.state).map((f) =>
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
  validate: (
    { action, ctx, getState, storage }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const draft = storage.get(action.payload);
    ctx.draft = draft;
    if (!draft) {
      reject(setErrorAlert(`Could not find draft named ${action.payload}`));
      return;
    }

    const nextAction = replaceUpload(draft); // also close modal
    if (getCanSaveUploadDraft(getState())) {
      next(
        batchActions([
          openModal("saveUploadDraft"),
          closeModal("openUpload"),
          setDeferredAction(nextAction),
        ])
      );
    } else {
      next(batchActions([nextAction, closeModal("openUpload")]));
    }
  },
});

const submitFileMetadataUpdateLogic = createLogic({
  process: async (
    {
      getApplicationMenu,
      getState,
      jssClient,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependencies,
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
        if (e.status !== HTTP_STATUS.NOT_FOUND) {
          dispatch(
            editFileMetadataFailed(
              `Could not delete file ${fileId}: ${e.message}`
            )
          );
          done();
        }
      }
    }

    const selectedJob = getSelectedJob(getState());
    if (selectedJob) {
      try {
        await jssClient.updateJob(
          selectedJob.jobId,
          { serviceFields: { deletedFileIds: fileIdsToDelete } },
          true
        );
      } catch (e) {
        dispatch(
          editFileMetadataFailed(
            `Could not update upload with deleted fileIds: ${e.message}`
          )
        );
      }
    } else {
      // todo
    }

    // This method currently deletes file metadata and then re-creates the file metadata since we
    // do not have a PUT endpoint yet.
    const createFileMetadataRequests = getCreateFileMetadataRequests(
      getState()
    );
    try {
      await Promise.all(
        createFileMetadataRequests.map(({ fileId, request }) =>
          mmsClient.editFileMetadata(fileId, request)
        )
      );
    } catch (e) {
      const message = e?.response?.data?.error || e.message;
      dispatch(editFileMetadataFailed("Could not edit files: " + message));
      done();
      return;
    }

    dispatch(
      batchActions([
        editFileMetadataSucceeded(),
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
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const selectedJob = getSelectedJob(getState());
    if (!selectedJob) {
      reject(setErrorAlert("Nothing found to update"));
    }
    next(action);
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
