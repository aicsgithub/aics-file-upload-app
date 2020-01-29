import { flatMap, forEach, groupBy, uniq } from "lodash";
import { createSelector } from "reselect";
import { getImagingSessions } from "../../state/metadata/selectors";
import { ImagingSession } from "../../state/metadata/types";
import { getAllPlates, getAllWells } from "../../state/selection/selectors";
import { PlateResponse, WellResponse } from "../../state/selection/types";
import { isFileRow } from "../../state/upload/constants";

import { getUpload, getWellLabelAndImagingSessionName } from "../../state/upload/selectors";
import { FileTagType, UploadMetadata, UploadStateBranch } from "../../state/upload/types";

// All tags representing wells should share the same color
export class FileTag implements FileTagType {
    public title: string;
    public color: string;

    constructor(title: string, color: string) {
        this.title = title;
        this.color = color;
    }
}

// Result used by the FolderTree to display tags by each file with associated metadata
export const getFileToTags = createSelector([
    getUpload,
    getImagingSessions,
    getAllPlates,
    getAllWells,
], (
    upload: UploadStateBranch,
    imagingSessions: ImagingSession[],
    selectedPlates: PlateResponse[],
    wells: WellResponse[]
    ): Map<string, FileTagType[]> => {
    const uploadsGroupedByFile = groupBy(upload, "file");
    const result = new Map<string, FileTagType[]>();
    forEach(uploadsGroupedByFile, (metadata: UploadMetadata[], file: string) => {
        const workflows = flatMap(metadata, (m) => m.workflows || []);
        const wellIds = flatMap(metadata, (m) => m.wellIds || []);
        const wellTags: string[] = [];
        wellIds.forEach((wellId: number) => {
           const label = getWellLabelAndImagingSessionName(
               wellId,
               imagingSessions,
               selectedPlates,
               wells
           );
           wellTags.push(label);
        });

        const tags = [
            ...uniq(workflows).map((w: string) => new FileTag(w, "blue")),
            ...uniq(wellTags).map((w: string) => new FileTag(w, "magenta")),
        ];
        const fileRows = metadata.filter(isFileRow);
        let shouldBeInArchive = false;
        let shouldBeInLocal = false;
        if (fileRows.length) {
            const fileRow = fileRows[0];
            shouldBeInArchive = Boolean(fileRow.shouldBeInArchive);
            shouldBeInLocal = Boolean(fileRow.shouldBeInLocal);
        }
        if (shouldBeInArchive) {
            tags.push(new FileTag("Archive", "green"));
        }
        if (shouldBeInLocal) {
            tags.push(new FileTag("Isilon", "green"));
        }
        result.set(file, tags);
    });
    return result;
});
