import { createSelector } from "reselect";
import { getWellIdToWellLabelMap } from "../../state/selection/selectors";
import { Workflow } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { FileTagType, UploadStateBranch } from "../../state/upload/types";

// All tags representing wells should share the same color
export class FileTag implements FileTagType {
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
], (upload: UploadStateBranch, wellIdToWellLabel: Map<number, string>): Map<string, FileTagType[]> => {

    const fullPathToTags = new Map<string, FileTagType[]>();
    for (const fullPath in upload) {
        // Don't include JavaScript object meta properties
        if (upload.hasOwnProperty(fullPath)) {
            const metadata = upload[fullPath];
            let tags;
            if (metadata.wellIds) {
                tags = metadata.wellIds.map((wellId) => (
                    new FileTag(wellIdToWellLabel.get(wellId) || "")
                ));
            } else {
                tags = metadata.workflows.map(({ name }: Workflow) => (
                    new FileTag(name)
                ));
            }
            fullPathToTags.set(fullPath, tags);
        }
    }
    return fullPathToTags;
});
