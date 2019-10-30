import { flatMap, forEach, groupBy, uniq } from "lodash";
import { createSelector } from "reselect";

import { getUpload } from "../../state/upload/selectors";
import { FileTagType, UploadMetadata, UploadStateBranch } from "../../state/upload/types";

// All tags representing wells should share the same color
export class FileTag implements FileTagType {
    public title: string;
    public color: string;

    constructor(title: string, color: "magenta" | "blue") {
        this.title = title;
        this.color = color;
    }
}

// Result used by the FolderTree to display tags by each file with associated metadata
export const getFileToTags = createSelector([
    getUpload,
], (upload: UploadStateBranch): Map<string, FileTagType[]> => {
    const uploadsGroupedByFile = groupBy(upload, "file");
    const result = new Map<string, FileTagType[]>();
    forEach(uploadsGroupedByFile, (metadata: UploadMetadata[], file: string) => {
        const workflows = flatMap(metadata, (m) => m.workflows || []).sort();
        const wellLabels = flatMap(metadata, (m) => m.wellLabels || []).sort();
        result.set(file, [
            ...uniq(workflows).map((w: string) => new FileTag(w, "blue")),
            ...uniq(wellLabels).map((w: string) => new FileTag(w, "magenta")),
        ]);
    });
    return result;
});
