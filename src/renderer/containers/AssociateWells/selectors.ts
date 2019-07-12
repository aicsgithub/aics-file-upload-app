import { intersection, uniq } from "lodash";
import { createSelector } from "reselect";
import { getSelectedWellsWithData } from "../../state/selection/selectors";
import { Well } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { UploadStateBranch } from "../../state/upload/types";

export const getWellIdToFiles = createSelector([getUpload], (upload: UploadStateBranch) => {
    const wellIdToFilesMap = new Map<number, string[]>();
    for (const fullPath in upload) {
        if (upload.hasOwnProperty(fullPath)) {
            const metadata = upload[fullPath];

            metadata.wellIds.forEach((wellId) => {
                if (wellIdToFilesMap.has(wellId)) {
                    const files: string[] = wellIdToFilesMap.get(wellId) || [];
                    files.push(fullPath);
                    wellIdToFilesMap.set(wellId, uniq(files));
                } else {
                    wellIdToFilesMap.set(wellId, [fullPath]);
                }
            });
        }
    }

    return wellIdToFilesMap;
});

export const getMutualFiles = createSelector([
    getSelectedWellsWithData,
    getWellIdToFiles,
], (selectedWellsData: Well[], wellIdToFiles: Map<number, string[]>): string[] => {
    if (!selectedWellsData.length || !wellIdToFiles.size) {
        return [];
    }
    let mutualFiles = wellIdToFiles.get(selectedWellsData[0].wellId);
    for (let wellIndex = 1; wellIndex < selectedWellsData.length; wellIndex += 1) {
        const currentFiles = wellIdToFiles.get(selectedWellsData[wellIndex].wellId);
        if (!mutualFiles || !mutualFiles.length || !currentFiles || !currentFiles.length) {
            return [];
        }
        mutualFiles = intersection(mutualFiles, currentFiles);
    }
    return mutualFiles || [];
});
