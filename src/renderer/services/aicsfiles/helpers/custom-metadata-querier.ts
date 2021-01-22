import { ILogger } from "js-logger/src/types";
import { keys, uniq, reduce, forOwn, isEmpty, omit } from "lodash";
import moment from "moment";

import { LabkeyClient, MMSClient } from "../../";
import { WELL_ANNOTATION_NAME } from "../../../constants";
import { FILE_METADATA, FMS, UPLOADER } from "../constants";
import {
  CustomFileMetadata,
  FileMetadata,
  FileToFileMetadata,
  Filter,
  FilterType,
  ImageModelMetadata,
  LabKeyFileMetadata,
} from "../types";

const { createFilter } = LabkeyClient;

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

interface LabKeyAnnotation {
  annotationId: number;
  "annotationTypeId/Name": string;
  name: string;
}

interface AnnotationLookup {
  "lookupId/SchemaName": string;
  "lookupId/TableName": string;
  "lookupId/ColumnName": string;
}

/*
    Query helper for the custom file metadata schemas in LabKey
 */
export class CustomMetadataQuerier {
  private readonly logger: ILogger;
  private readonly mms: MMSClient;
  private readonly lk: LabkeyClient;

  /*
        This returns the shared FileMetadata between the two given FileMetadata objects

        :param fileMetadata1: The first FileMetadata object
        :param fileMetadata2: The second FileMetadata object
        :return: The shared FileMetadata between the two supplied objects
    */
  public static innerJoinResults(
    fileToFileMetadata1: FileToFileMetadata,
    fileToFileMetadata2: FileToFileMetadata
  ): FileToFileMetadata {
    if (isEmpty(fileToFileMetadata1) || isEmpty(fileToFileMetadata2)) {
      return {};
    }
    const result: FileToFileMetadata = {};
    Object.keys(fileToFileMetadata1).forEach((fileId) => {
      // If they share the same FileId add it to a new object to return
      if (fileId in fileToFileMetadata2) {
        result[fileId] = fileToFileMetadata1[fileId];
      }
    });
    return result;
  }

  public constructor(
    mms: MMSClient,
    labkeyClient: LabkeyClient,
    logger: ILogger
  ) {
    this.mms = mms;
    this.lk = labkeyClient;
    this.logger = logger;
  }

  // Queries the given table and returns a list of IDs matching the filter and column_name given
  private selectIdsFromFileMetadata = async (
    table: string,
    columnName: "fileId" | "imageModelId",
    filter: Filter
  ): Promise<(string | number)[]> => {
    const response = await this.lk.selectRowsAsList(
      FILE_METADATA,
      table,
      [columnName],
      [filter]
    );
    return response.map((annotation: any) => annotation[columnName]);
  };

  // Queries the given file and image model junction tables for File IDs matching the filter
  private queryFileJunctions = async (
    table: string,
    searchValue: string | number,
    filterColumn: string
  ): Promise<string[]> => {
    const fileIds = (await this.selectIdsFromFileMetadata(
      `File${table}Junction`,
      "fileId",
      createFilter(filterColumn, searchValue)
    )) as string[];
    const imageModelIds = await this.selectIdsFromFileMetadata(
      `ImageModel${table}Junction`,
      "imageModelId",
      createFilter(filterColumn, searchValue)
    );
    if (!imageModelIds.length) {
      return uniq(fileIds);
    }
    const fileIdsFromImageModels = (await this.selectIdsFromFileMetadata(
      "ImageModel",
      "fileId",
      createFilter("ImageModelId", imageModelIds, FilterType.IN)
    )) as string[];
    return uniq([...fileIds, ...fileIdsFromImageModels]);
  };

  // Returns MMS GET File Metadata Response for given FileId
  public queryByFileId = async (fileId: string): Promise<FileMetadata> => {
    const [labkeyFileMetadata, customFileMetadata] = await Promise.all([
      this.lk.selectFirst<LabKeyFileMetadata>(
        FMS,
        "File",
        RELEVANT_FILE_COLUMNS,
        [createFilter("FileId", fileId)]
      ),
      this.mms.getFileMetadata(fileId) as Promise<CustomFileMetadata>,
    ]);
    return {
      ...labkeyFileMetadata,
      ...customFileMetadata,
    };
  };

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

  /*
    This method queries for all files that were uploaded by the given user.

    :param userName: The user that uploaded the files querying for
    :return: Dictionary of FileIds to metadata objects representing all metadata for the file
   */
  public queryByUser = async (
    userName: string
  ): Promise<FileToFileMetadata> => {
    const responses = await this.lk.selectRowsAsList(
      FMS,
      "File",
      ["FileId"],
      [createFilter("CreatedBy", userName)]
    );
    const fileIds = responses.map((response: any) => response.fileId);
    this.logger.info(`Found ${fileIds.length} files uploaded by ${userName}`);
    return this.queryByFileIds(fileIds);
  };

  /*
    This method queries for all files that were uploaded by the given user.

    :param template: Id of template used to upload the files querying for
    :return: Dictionary of FileIds to metadata objects representing all metadata for the file
   */
  public queryByTemplate = async (
    templateId: number
  ): Promise<FileToFileMetadata> => {
    const responses = await this.lk.selectRowsAsList(
      UPLOADER,
      "FileTemplateJunction",
      ["FileId"],
      [createFilter("TemplateId", templateId)]
    );
    const fileIds = responses.map((response: any) => response.fileId);
    this.logger.info(
      `Found ${fileIds.length} files uploaded with ${templateId}`
    );
    return this.queryByFileIds(fileIds);
  };

  /*
        This method queries for all files that contain the given annotationName and are equal to the given value.

        :param annotationName: The name of the Annotation we are querying
        :param searchValue: The value the file should have for the Annotation we are querying
        :return: Dictionary of FileIds to metadata objects representing all metadata for the file
    */
  public queryByAnnotation = async (
    annotationName: string,
    searchValue: string
  ): Promise<FileToFileMetadata> => {
    // Get the AnnotationId and AnnotationType matching the Annotation Name provided
    const annotation = await this.lk.selectFirst<LabKeyAnnotation>(
      FILE_METADATA,
      "Annotation",
      ["AnnotationId", "AnnotationTypeId/Name"],
      [createFilter("Name", annotationName)]
    );
    let fileIds: string[];
    // If the AnnotationType is Lookup we have to query against a specific junction table
    if (annotation["annotationTypeId/Name"] !== "Lookup") {
      fileIds = await this.queryFileJunctions(
        "CustomAnnotation",
        searchValue,
        "Value"
      );
    } else {
      // Get PrimaryKeyId matching the value given from the LK table it belongs to
      const lookup = await this.lk.selectFirst<AnnotationLookup>(
        FILE_METADATA,
        "AnnotationLookup",
        ["LookupId/SchemaName", "LookupId/TableName", "LookupId/ColumnName"],
        [createFilter("AnnotationId", annotation["annotationId"])]
      );
      const annotationIdColumnName = `${lookup["lookupId/TableName"]}Id`;
      const lookupValue: any = await this.lk.selectFirst(
        lookup["lookupId/SchemaName"],
        lookup["lookupId/TableName"],
        [annotationIdColumnName],
        [createFilter(lookup["lookupId/ColumnName"], searchValue)]
      );
      // Table names in DB are stored in lowercase, the Dict should only have one key, the ID we need
      const properlyCasedColumn = keys(lookupValue).find(
        (key) => key.toLowerCase() === annotationIdColumnName.toLowerCase()
      );
      if (!properlyCasedColumn) {
        throw new Error(
          `Unable to determine actual Column name for ${lookupValue}`
        );
      }
      const primaryKeyId = lookupValue[properlyCasedColumn];
      // Retrieve File IDs matching the value (as converted into its corresponding PrimaryKey value)
      fileIds = await this.queryFileJunctions(
        lookup["lookupId/TableName"],
        primaryKeyId,
        annotationIdColumnName
      );
    }
    this.logger.debug(
      "Successfully retrieved List of File IDs matching filter"
    );
    const response = await this.queryByFileIds(fileIds);
    this.logger.info(
      `Successfully built up Dictionary of ${fileIds.length} File IDs`
    );
    return response;
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
      this.lk.selectRowsAsList(UPLOADER, "Template", ["TemplateId", "Name"]),
      this.lk.selectRowsAsList(FILE_METADATA, "Annotation", [
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
                values = values.map((v) => {
                  // We don't want to rely on moment in the long-term, but since
                  // it's already a dep we use, we use it hear to convert the
                  // duration from milliseconds into an object.
                  const duration = moment.duration(parseInt(v));
                  // TODO: Can we specific `Duration` type without circular dep?
                  return {
                    days: duration.days(),
                    hours: duration.hours(),
                    minutes: duration.minutes(),
                    seconds:
                      duration.seconds() + duration.milliseconds() / 1000,
                  };
                });
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
}
