import { get, isNil } from "lodash";

import { makeConstant } from "../util";

import { UploadJobTableRow, UploadMetadata, UploadRowId } from "./types";

const BRANCH_NAME = "upload";

export const APPLY_TEMPLATE = makeConstant(BRANCH_NAME, "apply-template");
export const ASSOCIATE_FILES_AND_WELLS = makeConstant(BRANCH_NAME, "associate-files-and-wells");
export const ASSOCIATE_FILES_AND_WORKFLOWS = makeConstant(BRANCH_NAME, "associate-files-and-workflows");
export const CANCEL_UPLOAD = makeConstant(BRANCH_NAME, "cancel-upload");
export const CLEAR_UPLOAD = makeConstant(BRANCH_NAME, "clear-upload");
export const CLEAR_UPLOAD_HISTORY = makeConstant(BRANCH_NAME, "clear-history");
export const DELETE_UPLOADS = makeConstant(BRANCH_NAME, "delete-uploads");
export const INITIATE_UPLOAD = makeConstant(BRANCH_NAME, "initiate-upload");
export const OPEN_UPLOAD_DRAFT = makeConstant(BRANCH_NAME, "open-upload-draft");
export const REMOVE_FILE_FROM_ARCHIVE = makeConstant(BRANCH_NAME, "remove-file-from-archive");
export const REMOVE_FILE_FROM_ISILON = makeConstant(BRANCH_NAME, "remove-file-from-isilon");
export const REPLACE_UPLOAD = makeConstant(BRANCH_NAME, "replace-upload");
export const UNDO_FILE_WELL_ASSOCIATION = makeConstant(BRANCH_NAME, "undo-file-well-association");
export const UNDO_FILE_WORKFLOW_ASSOCIATION = makeConstant(BRANCH_NAME, "undo-file-workflow-association");
export const JUMP_TO_PAST_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-past");
export const JUMP_TO_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-upload");
export const RETRY_UPLOAD = makeConstant(BRANCH_NAME, "retry-upload");
export const SAVE_UPLOAD_DRAFT = makeConstant(BRANCH_NAME, "save-upload-draft");
export const UPDATE_SUB_IMAGES = makeConstant(BRANCH_NAME, "update-sub-images");
export const UPDATE_UPLOAD = makeConstant(BRANCH_NAME, "update-upload");
export const UPDATE_UPLOADS = makeConstant(BRANCH_NAME, "update-uploads");
export const UPDATE_FILES_TO_ARCHIVE = makeConstant(BRANCH_NAME, "update-files-to-archive");
export const UPDATE_FILES_TO_STORE_ON_ISILON = makeConstant(BRANCH_NAME, "update-files-to-store-on-isilon");

// todo could do hash eventually but we're being safe for now
export const getUploadRowKey = (
    {
        file,
        positionIndex,
        channelId,
        scene,
        subImageName,
    }: UploadRowId
) => {
    let key = file;
    if (!isNil(positionIndex)) {
        key += `positionIndex:${positionIndex}`;
    }

    if (!isNil(scene)) {
        key += `scene:${scene}`;
    }

    if (!isNil(subImageName)) {
        key += `subImageName:${subImageName}`;
    }

    if (!isNil(channelId)) {
        key += `channel:${channelId}`;
    }

    return key;
};

export const getUploadRowKeyFromUploadTableRow = (upload: UploadJobTableRow): string => {
    const {
        channel,
        file,
        positionIndex,
        scene,
        subImageName,
    } = upload;
    return getUploadRowKey({
        channelId: get(channel, ["channelId"]),
        file,
        positionIndex,
        scene,
        subImageName,
    });
};

export const isSubImageRow = ({positionIndex, scene, subImageName}: UploadMetadata) =>
    !isNil(positionIndex) || !isNil(scene) || !isNil(subImageName);
export const isSubImageOnlyRow = (metadata: UploadMetadata) => isSubImageRow(metadata) && isNil(metadata.channel);
export const isChannelOnlyRow = (metadata: UploadMetadata) => !isNil(metadata.channel) && !isSubImageRow(metadata);
export const isFileRow = (metadata: UploadMetadata) => !isChannelOnlyRow(metadata) && !isSubImageRow(metadata);
