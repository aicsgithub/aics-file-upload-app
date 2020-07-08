/* tslint:disable:max-classes-per-file */

import { ImageModelMetadata } from "@aics/aicsfiles/type-declarations/types";
import { expect } from "chai";
import { createSandbox, spy, stub, useFakeTimers } from "sinon";

import {
  alphaOrderComparator,
  API_WAIT_TIME_SECONDS,
  convertToArray,
  ensureDraftGetsSaved,
  getSetAppliedTemplateAction,
  getSetPlateAction,
  getWithRetry,
  makePosixPathCompatibleWithPlatform,
  retrieveFileMetadata,
  SERVICE_MIGHT_BE_DOWN_MESSAGE,
  splitTrimAndFilter,
  titleCase,
} from "../";
import {
  GetPlateResponse,
  PlateResponse,
} from "../../services/mms-client/types";
import {
  addRequestToInProgress,
  clearAlert,
  removeRequestFromInProgress,
  setAlert,
} from "../../state/feedback/actions";
import { Well } from "../../state/selection/types";
import { setAppliedTemplate } from "../../state/template/actions";
import { SetAppliedTemplateAction } from "../../state/template/types";
import {
  dialog,
  fms,
  mmsClient,
  mockReduxLogicDeps,
} from "../../state/test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAuditInfo,
  mockBooleanAnnotation,
  mockFavoriteColorAnnotation,
  mockMMSTemplate,
  mockNumberAnnotation,
  mockState,
  nonEmptyStateForInitiatingUpload,
} from "../../state/test/mocks";
import {
  AlertType,
  AsyncRequest,
  HTTP_STATUS,
  ReduxLogicTransformDependencies,
  State,
} from "../../state/types";
import { getUploadRowKey } from "../../state/upload/constants";
import { getWellLabel } from "../index";

describe("General utilities", () => {
  const sandbox = createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  describe("getWellLabel", () => {
    it("should display A1 given {row: 0, col: 0}", () => {
      const wellLabel = getWellLabel({ row: 0, col: 0 });
      expect(wellLabel).to.equal("A1");
    });

    it("should display Z14 given {row: 25, col: 13}", () => {
      const wellLabel = getWellLabel({ row: 25, col: 13 });
      expect(wellLabel).to.equal("Z14");
    });

    it("should throw error given {row: -1, col: 0}", () => {
      expect(() => getWellLabel({ row: -1, col: 0 })).to.throw();
    });

    it("should throw error given {row: 0, col: -1}", () => {
      expect(() => getWellLabel({ row: 0, col: -1 })).to.throw();
    });

    it("should throw error given {row: 26, col: 0}", () => {
      expect(() => getWellLabel({ row: 26, col: 0 })).to.throw();
    });

    it("should display None given undefined well", () => {
      const wellLabel = getWellLabel(undefined);
      expect(wellLabel).to.equal("None");
    });

    it("should display custom text given undefined well and custom none text provided", () => {
      const NONE = "Oops";
      const wellLabel = getWellLabel(undefined, NONE);
      expect(wellLabel).to.equal(NONE);
    });
  });

  describe("alphaOrderComparator", () => {
    it("should return 0 if strings are equal", () => {
      const result = alphaOrderComparator("foo", "foo");
      expect(result).to.equal(0);
    });

    it("should return 1 if a is alphabetically before b", () => {
      const result = alphaOrderComparator("bar", "foo");
      expect(result).to.equal(1);
    });

    it("should return -1 if a is alphabetically after b", () => {
      const result = alphaOrderComparator("foo", "bar");
      expect(result).to.equal(-1);
    });
  });

  describe("titleCase", () => {
    it("should return Cas9 when given Cas9", () => {
      const result = titleCase("Cas9");
      expect(result).to.equal("Cas9");
    });
    it("returns Cas99 when given cas99", () => {
      const result = titleCase("cas99");
      expect(result).to.equal("Cas99");
    });
    it('returns Cas99 when given "cas 9 9"', () => {
      const result = titleCase("cas 9 9");
      expect(result).to.equal("Cas99");
    });
  });

  describe("convertToArray", () => {
    it("returns an empty array given undefined", () => {
      const result = convertToArray(undefined);
      expect(result).to.deep.equal([]);
    });
    it("returns an empty array given null", () => {
      const result = convertToArray(null);
      expect(result).to.deep.equal([]);
    });
    it("returns an empty array given empty string", () => {
      const result = convertToArray("");
      expect(result).to.deep.equal([]);
    });
    it("returns an array length=1 array given 0", () => {
      const result = convertToArray(0);
      expect(result).to.deep.equal([0]);
    });
    it("returns an array length=1 array given false", () => {
      const result = convertToArray(false);
      expect(result).to.deep.equal([false]);
    });
    it("returns an array if passsed an array", () => {
      const result = convertToArray(["bob"]);
      expect(result).to.deep.equal(["bob"]);
    });
  });

  describe("splitTrimAndFilter", () => {
    it("splits string on commas, trims whitespace", () => {
      const result = splitTrimAndFilter("abc, de ,fg");
      expect(result).to.deep.equal(["abc", "de", "fg"]);
    });
    it("returns empty array give comma", () => {
      const result = splitTrimAndFilter(",");
      expect(result).to.deep.equal([]);
    });
  });

  describe("makePosixPathCompatibleWithPlatform", () => {
    const posixPath = "/arbitrary/path";

    it('doesn\'t change path if platform is "darwin"', () => {
      expect(makePosixPathCompatibleWithPlatform(posixPath, "darwin")).to.equal(
        posixPath
      );
    });
    it('doesn\'t change path if platform is "linux"', () => {
      expect(makePosixPathCompatibleWithPlatform(posixPath, "linux")).to.equal(
        posixPath
      );
    });
    it('updates path if platform is "win32"', () => {
      const expectedPath = "\\arbitrary\\path";
      expect(makePosixPathCompatibleWithPlatform(posixPath, "win32")).to.equal(
        expectedPath
      );
    });
    it('adds additional backward slash if path starts with /allen and platform is "win32"', () => {
      const expectedPath = "\\\\allen\\aics\\sw";
      expect(
        makePosixPathCompatibleWithPlatform("/allen/aics/sw", "win32")
      ).to.equal(expectedPath);
    });
    it('doesn\'t add additional backward slash if path starts with //allen and platform is "win32"', () => {
      const expectedPath = "\\\\allen\\aics\\sw";
      expect(
        makePosixPathCompatibleWithPlatform("//allen/aics/sw", "win32")
      ).to.equal(expectedPath);
    });
  });

  describe("getWithRetry", () => {
    const mockBadGatewayResponse = {
      config: {},
      isAxiosError: true,
      message: "Bad Gateway",
      name: "",
      response: {
        config: {},
        data: [],
        headers: {},
        status: HTTP_STATUS.BAD_GATEWAY,
        statusText: "Bad Gateway",
      },
    };

    const mockCannotFindAddressError = {
      code: "ENOTFOUND",
      config: {},
      message: "getaddrinfo ENOTFOUND stg-aics.corp.alleninstitute.org",
      name: "Error",
    };

    it("Adds request to requests in progress", async () => {
      const request = stub().resolves({});
      const dispatchSpy = spy();
      await getWithRetry(
        request,
        AsyncRequest.REQUEST_METADATA,
        dispatchSpy,
        "Service"
      );
      expect(
        dispatchSpy.calledWith(
          addRequestToInProgress(AsyncRequest.REQUEST_METADATA)
        )
      ).to.be.true;
    });

    it("removes request from requests in progress if request is OK", async () => {
      const request = stub().resolves({});
      const dispatchSpy = spy();
      await getWithRetry(
        request,
        AsyncRequest.REQUEST_METADATA,
        dispatchSpy,
        "Service"
      );
      expect(
        dispatchSpy.calledWith(
          removeRequestFromInProgress(AsyncRequest.REQUEST_METADATA)
        )
      ).to.be.true;
    });

    it("removes request from requests in progress if request is not OK", async () => {
      const genericError = "generic error";
      const request = stub().rejects(genericError);
      const batchActionsSpy = spy();

      try {
        await getWithRetry(
          request,
          AsyncRequest.REQUEST_METADATA,
          spy(),
          "Service",
          genericError,
          batchActionsSpy
        );
      } catch (e) {
        const expectedActions = [
          removeRequestFromInProgress(AsyncRequest.REQUEST_METADATA),
          setAlert({
            message: genericError,
            type: AlertType.ERROR,
          }),
        ];
        expect(batchActionsSpy.calledWith(expectedActions)).to.be.true;
        expect(e.message).to.equal(genericError);
      }
    });
    it("does not retry request if response is non Bad Gateway or Cannot Find Address error", async () => {
      const message = "oops";
      const request = stub()
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject({ message, status: HTTP_STATUS.BAD_REQUEST });
        });

      try {
        await getWithRetry(
          request,
          AsyncRequest.REQUEST_METADATA,
          spy(),
          "Service"
        );
      } catch (e) {
        expect(request.callCount).to.equal(1);
        expect(e.message).to.equal(message);
      }
    });
    it("does not retry request if a response is non Bad Gateway or Cannot Find Address error", async () => {
      const message = "oops";
      const badRequest = stub()
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject({ message, status: HTTP_STATUS.BAD_REQUEST });
        });
      const request = stub().resolves([stub().resolves(), badRequest]);

      try {
        await getWithRetry(
          request,
          AsyncRequest.REQUEST_METADATA,
          spy(),
          "Service"
        );
      } catch (e) {
        expect(request.callCount).to.equal(1);
        expect(e.message).to.equal(message);
      }
    });
    it("shows error message if it only receives Bad Gateway error for 20 seconds", async function () {
      // here we're using a fake clock so that 20 seconds passes more quickly and to give control
      // over to the test in terms of timing.
      this.clock = useFakeTimers(new Date().getTime());

      // extends timeout for this test since we're testing a potentially long running process
      const waitTime = API_WAIT_TIME_SECONDS * 1000 + 3000;
      this.timeout(waitTime);

      let secondsPassed = 0;
      const incrementMs = 5000;

      const getStub = stub().callsFake(() => {
        this.clock.tick(incrementMs);
        secondsPassed += incrementMs / 1000;

        return Promise.reject(mockBadGatewayResponse);
      });

      const dispatchSpy = spy();

      try {
        await getWithRetry(
          getStub,
          AsyncRequest.REQUEST_METADATA,
          dispatchSpy,
          "Service"
        );
      } catch (e) {
        expect(
          dispatchSpy.calledWith(
            setAlert({
              manualClear: true,
              message: SERVICE_MIGHT_BE_DOWN_MESSAGE("Service"),
              type: AlertType.WARN,
            })
          )
        ).to.be.true;
        expect(secondsPassed).to.be.equal(API_WAIT_TIME_SECONDS);
      }
    });
    it("shows error message if it only receives Cannot Find Address error for 20 seconds", async function () {
      // here we're using a fake clock so that 20 seconds passes more quickly and to give control
      // over to the test in terms of timing.
      this.clock = useFakeTimers(new Date().getTime());

      // extends timeout for this test since we're testing a potentially long running process
      const waitTime = API_WAIT_TIME_SECONDS * 1000 + 3000;
      this.timeout(waitTime);

      let secondsPassed = 0;
      const incrementMs = 5000;

      const getStub = stub().callsFake(() => {
        this.clock.tick(incrementMs);
        secondsPassed += incrementMs / 1000;

        return Promise.reject(mockCannotFindAddressError);
      });

      const dispatchSpy = spy();

      try {
        await getWithRetry(
          getStub,
          AsyncRequest.REQUEST_METADATA,
          dispatchSpy,
          "Service"
        );
      } catch (e) {
        expect(
          dispatchSpy.calledWith(
            setAlert({
              manualClear: true,
              message: "Could not reach host. Retrying request...",
              type: AlertType.WARN,
            })
          )
        ).to.be.true;
        expect(secondsPassed).to.be.equal(API_WAIT_TIME_SECONDS);
      }
    });
    it("Stops retrying request after receiving OK response (After Bad Gateway Error)", async function () {
      this.timeout(API_WAIT_TIME_SECONDS * 1000 + 3000);
      const getStub = stub()
        .onFirstCall()
        .rejects(mockBadGatewayResponse)
        .onSecondCall()
        .callsFake(() => {
          return Promise.resolve({});
        });
      const dispatchSpy = spy();
      const batchActionsSpy = spy();

      await getWithRetry(
        getStub,
        AsyncRequest.REQUEST_METADATA,
        dispatchSpy,
        "Service",
        undefined,
        batchActionsSpy
      );

      expect(
        dispatchSpy.calledWith(
          setAlert({
            manualClear: true,
            message: SERVICE_MIGHT_BE_DOWN_MESSAGE("Service"),
            type: AlertType.WARN,
          })
        )
      );
      expect(
        batchActionsSpy.calledWith([
          clearAlert(),
          removeRequestFromInProgress(AsyncRequest.REQUEST_METADATA),
        ])
      );
    });
    it("Stops retrying request after receiving OK response (After Cannot Find Address Error)", async function () {
      this.timeout(API_WAIT_TIME_SECONDS * 1000 + 3000);
      const getStub = stub()
        .onFirstCall()
        .rejects(mockCannotFindAddressError)
        .onSecondCall()
        .callsFake(() => {
          return Promise.resolve({});
        });
      const dispatchSpy = spy();
      const batchActionsSpy = spy();

      await getWithRetry(
        getStub,
        AsyncRequest.REQUEST_METADATA,
        dispatchSpy,
        "Service",
        undefined,
        batchActionsSpy
      );

      expect(
        dispatchSpy.calledWith(
          setAlert({
            manualClear: true,
            message: SERVICE_MIGHT_BE_DOWN_MESSAGE("Service"),
            type: AlertType.WARN,
          })
        )
      );
      expect(
        batchActionsSpy.calledWith([
          clearAlert(),
          removeRequestFromInProgress(AsyncRequest.REQUEST_METADATA),
        ])
      );
    });
  });
  describe("getSetPlateAction", () => {
    const barcode = "123456";
    const mockEmptyWell: Well = {
      cellPopulations: [],
      col: 0,
      plateId: 1,
      row: 0,
      solutions: [],
      wellId: 1,
    };
    const mockPlate: PlateResponse = {
      ...mockAuditInfo,
      barcode,
      comments: "",
      imagingSessionId: undefined,
      plateGeometryId: 1,
      plateId: 1,
      plateStatusId: 1,
      seededOn: "2018-02-14 23:03:52",
    };
    it("creates a map of imagingSessionIds to plate and well info", async () => {
      const mockGetPlateResponse1: GetPlateResponse = {
        plate: mockPlate,
        wells: [mockEmptyWell],
      };
      const mockGetPlateResponse2: GetPlateResponse = {
        plate: { ...mockPlate, imagingSessionId: 4, plateId: 2 },
        wells: [{ ...mockEmptyWell, plateId: 2, wellId: 2 }],
      };
      const getPlateStub = stub();
      getPlateStub.withArgs(barcode, undefined).resolves(mockGetPlateResponse1);
      getPlateStub.withArgs(barcode, 4).resolves(mockGetPlateResponse2);
      sandbox.replace(mmsClient, "getPlate", getPlateStub);
      const dispatchSpy = spy();
      const imagingSessionIds = [null, 4];

      const setPlateAction = await getSetPlateAction(
        barcode,
        imagingSessionIds,
        mmsClient,
        dispatchSpy
      );
      expect(setPlateAction.payload.imagingSessionIds).to.equal(
        imagingSessionIds
      );
      expect(setPlateAction.payload.plate).to.deep.equal({
        0: mockPlate,
        4: { ...mockPlate, imagingSessionId: 4, plateId: 2 },
      });
      expect(setPlateAction.payload.wells).to.deep.equal({
        0: [mockEmptyWell],
        4: [{ ...mockEmptyWell, plateId: 2, wellId: 2 }],
      });
    });
  });
  describe("retrieveFileMetadata", () => {
    it("returns result of fms.transformFileMetadataIntoTable", async () => {
      const expected: ImageModelMetadata[] = [
        {
          fileId: "abc123",
          fileSize: 100,
          fileType: "image",
          filename: "my file",
          modified: "",
          modifiedBy: "foo",
          template: "my template",
          templateId: 1,
        },
      ];
      const getCustomMetadataForFileStub = stub().resolves([]);
      const transformFileMetadataIntoTableStub = stub().resolves(expected);
      sandbox.replace(
        fms,
        "getCustomMetadataForFile",
        getCustomMetadataForFileStub
      );
      sandbox.replace(
        fms,
        "transformFileMetadataIntoTable",
        transformFileMetadataIntoTableStub
      );
      const result = await retrieveFileMetadata(["abc123"], fms);
      expect(result).to.equal(expected);
    });
  });
  describe("getSetAppliedTemplateAction", () => {
    let mockStateWithUploads: State;
    const key = getUploadRowKey({ file: "/path/to/file1" });
    const template = {
      ...mockMMSTemplate,
      annotations: [
        mockFavoriteColorAnnotation,
        mockBooleanAnnotation,
        mockNumberAnnotation,
      ],
    };

    beforeEach(() => {
      mockStateWithUploads = {
        ...nonEmptyStateForInitiatingUpload,
        template: getMockStateWithHistory({
          ...nonEmptyStateForInitiatingUpload.template.present,
          appliedTemplate: {
            ...mockMMSTemplate,
            annotations: [
              mockFavoriteColorAnnotation,
              { ...mockNumberAnnotation, name: "Age" },
            ],
          },
        }),
        upload: getMockStateWithHistory({
          [key]: {
            Age: 16,
            "Favorite Color": "red",
            barcode: "1234",
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file" }),
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            wellIds: [1],
          },
        }),
      };
    });

    it("throws error if no boolean type set", () => {
      const getStateStub = stub().returns({
        ...mockStateWithUploads,
        metadata: {
          ...mockStateWithUploads.metadata,
          annotationTypes: [],
        },
      });
      sandbox.replace(mmsClient, "getTemplate", stub().resolves(template));
      expect(
        getSetAppliedTemplateAction(1, getStateStub, mmsClient, stub())
      ).to.be.rejectedWith(Error);
    });
    it("throws error if getTemplate request fails", () => {
      const getStateStub = stub().returns(mockStateWithUploads);
      sandbox.replace(
        mmsClient,
        "getTemplate",
        stub().rejects(new Error("Oops"))
      );
      expect(
        getSetAppliedTemplateAction(1, getStateStub, mmsClient, stub())
      ).to.be.rejectedWith(Error);
    });
    it("returns setAppliedTemplate action with template returned from MMS and expected upload", async () => {
      const getStateStub = stub().returns(mockStateWithUploads);
      sandbox.replace(mmsClient, "getTemplate", stub().resolves(template));
      const result: SetAppliedTemplateAction = await getSetAppliedTemplateAction(
        1,
        getStateStub,
        mmsClient,
        stub()
      );
      // the Age annotation goes away since it's not part of the applied template
      expect(result).to.deep.equal(
        setAppliedTemplate(template, {
          [key]: {
            // This annotation got added and is initialized as undefined
            "Clone Number Garbage": [],
            // this stays here because it is part of the template and does not get cleared out
            "Favorite Color": "red",
            // This annotation got added
            Qc: [false],
            barcode: "1234",
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file" }),
            shouldBeInArchive: true,
            shouldBeInLocal: true,
            wellIds: [1],
          },
        })
      );
    });
  });
  describe("ensureDraftGetsSaved", () => {
    const runTest = async (
      state: State,
      skipWarningDialog: boolean,
      showMessageBoxResponse?: number,
      saveFilePath?: string
    ) => {
      const writeFileStub = stub();
      const showMessageBoxStub = stub().resolves({
        response: showMessageBoxResponse,
      });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      const showSaveDialogStub = stub().resolves({ filePath: saveFilePath });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      const deps = ({
        ...mockReduxLogicDeps,
        getState: () => state,
        writeFile: writeFileStub,
      } as any) as ReduxLogicTransformDependencies;

      const result = await ensureDraftGetsSaved(deps, skipWarningDialog);
      return { result, showMessageBoxStub, showSaveDialogStub, writeFileStub };
    };
    it("automatically saves draft if user is working on a draft that has previously been saved", async () => {
      const state = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/foo",
        },
      };
      const {
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(state, false);
      expect(writeFileStub.called).to.be.true;
      expect(showMessageBoxStub.called).to.be.false;
      expect(showSaveDialogStub.called).to.be.false;
    });
    it("shows warning dialog if skipWarningDialog is false", async () => {
      const { showMessageBoxStub } = await runTest(mockState, false);
      expect(showMessageBoxStub.called).to.be.true;
    });
    it("does not show warning dialog if skipWarningDialog is true and opens save dialog", async () => {
      const { showMessageBoxStub, showSaveDialogStub } = await runTest(
        mockState,
        true
      );
      expect(showMessageBoxStub.called).to.be.false;
      expect(showSaveDialogStub.called).to.be.true;
    });
    it("returns { cancelled: false, filePath: undefined } if user chooses to discard draft", async () => {
      const { result, showMessageBoxStub, showSaveDialogStub } = await runTest(
        mockState,
        false,
        1 // discard button index
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });
    it("shows saveDialog and returns { cancelled: false, filePath } with filePath chosen by user", async () => {
      const filePath = "/foo";
      const {
        result,
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(
        mockState,
        false,
        2, // save button index
        filePath
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.true;
      expect(writeFileStub.called).to.be.true;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath,
      });
    });
    it("shows saveDialog and returns { cancelled: false, filePath: undefined } if user decides to cancel saving draft", async () => {
      const {
        result,
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(
        mockState,
        false,
        2, // save button index
        undefined
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.true;
      expect(writeFileStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });
    it("returns { cancelled: true, filePath: undefined } if user clicks Cancel in warning dialog", async () => {
      const { result, showMessageBoxStub, showSaveDialogStub } = await runTest(
        mockState,
        false,
        0 // cancel button index
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: true,
        filePath: undefined,
      });
    });
  });
});
