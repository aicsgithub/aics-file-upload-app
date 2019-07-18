import { difference, isEmpty, reduce, uniq } from "lodash";
import { createSelector } from "reselect";
import { getSelectedWellsWithData } from "../../state/selection/selectors";
import { Well } from "../../state/selection/types";
import { getUpload } from "../../state/upload/selectors";
import { UploadMetadata, UploadStateBranch } from "../../state/upload/types";

export interface WellIdToFilesMap {
    [wellId: number]: string[]; // filePaths
}

export const getWellIdToFiles = createSelector([getUpload], (upload: UploadStateBranch): WellIdToFilesMap => {
    return reduce(upload, (result: WellIdToFilesMap, {wellIds}: UploadMetadata, filePath: string) => {
        return {
            ...result,
            ...reduce(wellIds, (accum2: WellIdToFilesMap, wellId: number) => {
                const files = accum2[wellId] || [];
                return {
                    ...accum2,
                    [wellId]: uniq([...files, filePath]),
                };
            }, {}),
        };
    }, {});
});

export const getMutualFiles = createSelector([
    getSelectedWellsWithData,
    getUpload,
], (selectedWellsData: Well[], upload: UploadStateBranch): string[] => {
    if (isEmpty(selectedWellsData)) {
        return [];
    }

    const selectedWellIds = selectedWellsData.map((well: Well) => well.wellId);

    return reduce(upload, (files: string[], metadata: UploadMetadata, filepath: string) => {
        const allWellsFound = isEmpty(difference(selectedWellIds, metadata.wellIds));
        const accum = [...files];
        if (allWellsFound) {
            accum.push(filepath);
        }
        return accum;
    }, []);
});
