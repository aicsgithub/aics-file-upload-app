import { expect } from "chai";

import {
    getMockStateWithHistory,
    mockSelectedWells,
    mockSelectedWorkflows,
    mockSelection,
    mockState,
    mockWells,
} from "../../../state/test/mocks";
import {
    getMutualFilesForWells,
    getMutualFilesForWorkflows,
} from "../selectors";

describe("AssociateFiles selectors", () => {
    describe("getMutualFilesForWells", () => {
        it("returns file paths that are shared by the selected wells", () => {
            const arr = getMutualFilesForWells({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWells: mockSelectedWells.slice(0, 3),
                    wells: mockWells,
                }),
            });
            expect(arr[0]).to.equal("/path/to/file3");
            expect(arr.length).to.equal(1);
        });

        it("returns an empty array if no selected wells", () => {
            const arr = getMutualFilesForWells({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWells: [],
                }),
            });
            expect(arr).to.be.empty;
        });

        it("returns an empty array if no mutual files", () => {
            const arr = getMutualFilesForWells({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWells: mockSelectedWells,
                }),
            });
            expect(arr).to.be.empty;
        });
    });
    describe("getMutualFilesForWorkflows", () => {
        it("returns an empty array if no mutual files", () => {
            const arr = getMutualFilesForWorkflows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWorkflows: mockSelectedWorkflows,
                }),
            });
            expect(arr).to.be.empty;
        });

        it("returns an empty array if no selected workflows", () => {
            const arr = getMutualFilesForWorkflows({
                ...mockState,
                selection: getMockStateWithHistory({
                    ...mockSelection,
                    selectedWorkflows: [],
                }),
            });
            expect(arr).to.be.empty;
        });
    });
});
