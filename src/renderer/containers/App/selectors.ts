import { createSelector } from "reselect";
import { getWellIdToWellLabelMap } from "../../state/selection/selectors";
import { getUpload } from "../../state/upload/selectors";
import { FileTagType, UploadStateBranch } from "../../state/upload/types";

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
    getWellIdToWellLabelMap,
], (upload: UploadStateBranch, wellIdToWellLabel: Map<number, string>): Map<string, FileTagType[]> => {

    const fullPathToTags = new Map<string, FileTagType[]>();
    for (const fullPath in upload) {
        // Don't include JavaScript object meta properties
        if (upload.hasOwnProperty(fullPath)) {
            const metadata = upload[fullPath];
            let tags;
            if (metadata.workflows) {
                tags = metadata.workflows.map((workflow: string) => (
                    new FileTag(workflow, "blue")
                ));
            } else {
                tags = metadata.wellIds.map((wellId) => (
                    new FileTag(wellIdToWellLabel.get(wellId) || "", "magenta")
                ));
            }
            fullPathToTags.set(fullPath, tags);
        }
    }
    return fullPathToTags;
});
