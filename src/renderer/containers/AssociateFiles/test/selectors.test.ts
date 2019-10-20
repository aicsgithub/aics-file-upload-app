import { expect } from "chai";
import { difference, keys } from "lodash";

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
    getWellIdToFiles,
    getWorkflowNameToFiles
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
    describe("getWellIdToFiles", () => {
        it("returns an empty map given no uploads", () => {
            const map = getWellIdToFiles({
                ...mockState,
                upload: getMockStateWithHistory({}),
            });

            expect(keys(map).length).to.equal(0);
        });

        it("aggregates all files associated with a well given multiple files", () => {
            const barcode = "test_barcode";
            const wellId = 2;
            const wellLabel = "A1";
            const wellId2 = 5;
            const wellLabel2 = "A5";
            const map = getWellIdToFiles({
                ...mockState,
                upload: getMockStateWithHistory({
                    "/path1": {barcode, file: "/path1", wellIds: [wellId], wellLabels: [wellLabel], workflows: []},
                    "/path2": {barcode, file: "/path2", wellIds: [wellId], wellLabels: [wellLabel], workflows: []},
                    "/path3": {barcode, file: "/path3", wellIds: [wellId], wellLabels: [wellLabel], workflows: []},
                    "/path4": {barcode, file: "/path4", wellIds: [wellId2], wellLabels: [wellLabel2], workflows: []},
                }),
            });

            expect(keys(map).length).to.equal(2);
            const filesForWell1 = map[wellId];
            expect(filesForWell1).to.not.be.undefined;

            if (filesForWell1) {

                expect(difference(filesForWell1, ["/path1", "/path2", "/path3"]).length).to.equal(0);
            }

            const filesForWell2 = map[wellId2];
            expect(filesForWell2).to.not.be.undefined;

            if (filesForWell2) {
                expect(difference(filesForWell2, ["/path4"]).length).to.equal(0);
            }
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
    describe("getWorkflowNameToFiles", () => {
        it("returns an empty map given no uploads", () => {
            const map = getWorkflowNameToFiles({
                ...mockState,
                upload: getMockStateWithHistory({}),
            });

            expect(keys(map).length).to.equal(0);
        });

        it("aggregates all files associated with a workflow given multiple files", () => {
            const barcode = "test_barcode";
            const workflow = "name1";
            const workflow2 = "name2";
            const map = getWorkflowNameToFiles({
                ...mockState,
                upload: getMockStateWithHistory({
                    "/path1": {barcode, file: "/path1", wellIds: [], wellLabels: [], workflows: [workflow]},
                    "/path2": {barcode, file: "/path2", wellIds: [], wellLabels: [], workflows: [workflow]},
                    "/path3": {barcode, file: "/path3", wellIds: [], wellLabels: [], workflows: [workflow]},
                    "/path4": {barcode, file: "/path4", wellIds: [], wellLabels: [], workflows: [workflow2]},
                }),
            });

            expect(keys(map).length).to.equal(2);
            const filesForWorkflow1 = map[workflow];
            expect(filesForWorkflow1).to.not.be.undefined;

            if (filesForWorkflow1) {
                expect(difference(filesForWorkflow1, ["/path1", "/path2", "/path3"]).length).to.equal(0);
            }

            const filesForWorkflow2 = map[workflow2];
            expect(filesForWorkflow2).to.not.be.undefined;

            if (filesForWorkflow2) {
                expect(difference(filesForWorkflow2, ["/path4"]).length).to.equal(0);
            }
        });
    });
});
