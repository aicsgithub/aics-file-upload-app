import { ILogger } from "js-logger/src/types";
import { reduce, forOwn, omit } from "lodash";

import { LabkeyClient, MMSClient } from "../..";
import {
  DAY_AS_MS,
  HOUR_AS_MS,
  MINUTE_AS_MS,
  WELL_ANNOTATION_NAME,
} from "../../../constants";
import { Duration } from "../../../types";
import { FileMetadata, FileToFileMetadata, ImageModelMetadata } from "../util";

const { createFilter } = LabkeyClient;

export interface LabKeyFileMetadata {
  archiveFilePath?: string;
  filename: string;
  fileId: string;
  fileSize: number;
  fileType: string;
  localFilePath?: string;
  publicFilePath?: string;
  thumbnailLocalFilePath?: string;
  thumbnailId?: string;
  modified: string;
  modifiedBy: string;
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

enum Schema {
  FILE_METADATA = "filemetadata",
  FMS = "FMS",
  UPLOADER = "uploader",
}

/*
    Query helper for the custom file metadata schemas in LabKey
 */
export default class Querier {
  private readonly logger: ILogger;
  private readonly mms: MMSClient;
  private readonly lk: LabkeyClient;

  public constructor(
    mms: MMSClient,
    labkeyClient: LabkeyClient,
    logger: ILogger
  ) {
    this.mms = mms;
    this.lk = labkeyClient;
    this.logger = logger;
  }

  // Returns MMS GET File Metadata Response for given FileIds
  public queryByFileIds = async (
    fileIds: string[]
  ): Promise<FileToFileMetadata> => {
    // Naive implementation to get us going
    const resolvedPromises = await Promise.all(
      fileIds.map((fileId) => this.queryByFileId(fileId))
    );
    return reduce(
      resolvedPromises,
      (
        filesToFileMetadata: FileToFileMetadata,
        fileMetadata: FileMetadata
      ) => ({
        ...filesToFileMetadata,
        [fileMetadata.fileId]: fileMetadata,
      }),
      {}
    );
  };

  // Returns MMS GET File Metadata Response for given FileId
  private queryByFileId = async (fileId: string): Promise<FileMetadata> => {
    const [labkeyFileMetadata, customFileMetadata] = await Promise.all([
      this.lk.selectFirst<LabKeyFileMetadata>(
        Schema.FMS,
        "File",
        RELEVANT_FILE_COLUMNS,
        [createFilter("FileId", fileId)]
      ),
      this.mms.getFileMetadata(fileId),
    ]);
    return {
      ...labkeyFileMetadata,
      ...customFileMetadata,
    };
  };

  /*
        Transforms file metadata given into a table like format easier for displaying to users or exporting to character
        separated value sets.

        :param filesToFileMetadata: Object mapping File Ids to MMS GET File Metadata responses
        :return: Array of ImageModels to their metadata
     */
  public transformFileMetadataIntoTable = async (
    filesToFileMetadata: FileToFileMetadata
  ): Promise<ImageModelMetadata[]> => {
    const [possibleTemplates, possibleAnnotations] = await Promise.all([
      this.lk.selectRowsAsList(Schema.UPLOADER, "Template", [
        "TemplateId",
        "Name",
      ]),
      this.lk.selectRowsAsList(Schema.FILE_METADATA, "Annotation", [
        "AnnotationId",
        "AnnotationTypeId/Name",
        "Name",
      ]),
    ]);
    const templateIdToNameMap = this.getIdToNameMap(
      "templateId",
      possibleTemplates
    );
    const annotationIdToAnnotationMap = this.getAnnotationIdToAnnotationMap(
      possibleAnnotations
    );

    const keyToImageModel: {
      [key: string]: ImageModelMetadata;
    } = {};
    forOwn(
      filesToFileMetadata,
      (fileMetadata: FileMetadata, fileId: string) => {
        fileMetadata.annotations.forEach(
          ({
            annotationId,
            positionIndex,
            channelId,
            scene,
            subImageName,
            fovId,
            values,
          }) => {
            const key = `${fileId}-${positionIndex}-${channelId}-${scene}-${fovId}-${subImageName}`;
            // If the ImageModel (combination of File, Position, & Channel) has not been seen yet add it to the
            // object with the File metadata
            if (!keyToImageModel[key]) {
              keyToImageModel[key] = omit(
                {
                  ...fileMetadata,
                  channelId,
                  fileId: fileId || "",
                  fovId,
                  positionIndex,
                  scene,
                  subImageName,
                  template: fileMetadata.templateId
                    ? templateIdToNameMap[fileMetadata.templateId]
                    : undefined,
                },
                ["annotations", "labkeyurlModifiedBy", "labkeyurlThumbnailId"]
              ) as ImageModelMetadata;
            }
            const annotation = annotationIdToAnnotationMap[annotationId];
            if (!annotation) {
              throw new Error(
                `Unable to find matching Annotation for Annotation ID: ${annotationId}`
              );
            }
            const annotationName = annotation.name;
            const annotationTypeName = annotation["annotationTypeId/Name"]
              ? annotation["annotationTypeId/Name"].toLowerCase()
              : undefined;
            // The well annotation is treated differently from other lookups. The display value is the well label (i.e. A1)
            // which is does not uniquely identify a well in the DB so the wellId is stored as a value instead.
            if (annotationName === WELL_ANNOTATION_NAME) {
              values = values.map((v) => parseInt(v, 10));
            }
            switch (annotationTypeName) {
              case "date":
              case "datetime":
                values = values.map((v) => new Date(`${v}`));
                break;
              case "number":
                values = values.map((v) => {
                  try {
                    return parseFloat(v);
                  } catch (e) {
                    this.logger.error(
                      `Annotation ${annotation.name} for file ${fileId} has a value that is not a number`
                    );
                    return v;
                  }
                });
                break;
              case "yesno":
                values = values.map((v) => Boolean(v));
                break;
              case "duration":
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

            if (keyToImageModel[key][annotationName] === undefined) {
              keyToImageModel[key][annotationName] = values;
            } else if (Array.isArray(keyToImageModel[key][annotationName])) {
              keyToImageModel[key][annotationName].push(...values);
            } else {
              throw new Error(
                `Value in ImageModel for ${annotationName} was supposed to be an array`
              );
            }
          }
        );
      }
    );
    this.logger.info("Successfully built up table");
    return Object.values(keyToImageModel);
  };

  private getIdToNameMap = (
    idColumn: string,
    options: any[]
  ): { [id: number]: string } => {
    return options.reduce(
      (accum: { [id: number]: string }, curr: any) => ({
        ...accum,
        [curr[idColumn]]: curr.name,
      }),
      {}
    );
  };

  private getAnnotationIdToAnnotationMap = (annotations: any[]) =>
    annotations.reduce(
      (accum, curr: any) => ({
        ...accum,
        [curr.annotationId]: curr,
      }),
      {}
    );
}
