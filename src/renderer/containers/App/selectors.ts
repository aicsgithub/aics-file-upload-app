import { flatMap, forEach, groupBy, uniq } from "lodash";
import { createSelector } from "reselect";
import { getImagingSessions } from "../../state/metadata/selectors";
import { ImagingSession } from "../../state/metadata/types";
import { getAllPlates, getAllWells } from "../../state/selection/selectors";
import { PlateResponse, WellResponse } from "../../state/selection/types";
import { isFileRow } from "../../state/upload/constants";

import { getUpload } from "../../state/upload/selectors";
import { FileTagType, UploadMetadata, UploadStateBranch } from "../../state/upload/types";
import { getWellLabel } from "../../util";

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
        wellIds.forEach((wellId: number, i: number) => {
            const well = wells.find((w) => w.wellId === wellId);
            let label = "ERROR";
            if (well) {
                label = getWellLabel({col: well.col, row: well.row});
                const plate = selectedPlates.find((p) => p.plateId === well.plateId);

                if (plate && plate.imagingSessionId) {
                    const imagingSession = imagingSessions
                        .find((is) => is.imagingSessionId === plate.imagingSessionId);
                    if (imagingSession) {
                        label += ` (${imagingSession.name})`;
                    }
                }
            }
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
