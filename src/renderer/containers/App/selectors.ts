import { createSelector } from "reselect";
import { getWellIdToWellLabelMap } from "../../state/selection/selectors";
import { getUpload } from "../../state/upload/selectors";
import { FileTag, UploadStateBranch } from "../../state/upload/types";

// All tags representing wells should share the same color
export class WellFileTag implements FileTag {
    public title: string;
    public readonly color: string = "magenta";

    constructor(title: string) {
        this.title = title;
    }
}

// Result used by the FolderTree to display tags by each file with associated metadata
export const getFileToTags = createSelector([
    getUpload,
    getWellIdToWellLabelMap,
], (upload: UploadStateBranch, wellIdToWellLabel: Map<number, string>):
Map<string, FileTag[]> => {

    const fullPathToTags = new Map<string, FileTag[]>();
    for (const fullPath in upload) {
        // Don't include JavaScript object meta properties
        if (upload.hasOwnProperty(fullPath)) {
            const metadata = upload[fullPath];
            const tags = metadata.wellIds.map(wellId => (
                new WellFileTag(wellIdToWellLabel.get(wellId) || '')
            ));

            fullPathToTags.set(fullPath, tags);
        }
    }
    return fullPathToTags;
});
