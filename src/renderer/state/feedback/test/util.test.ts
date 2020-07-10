import { expect } from "chai";
import { SinonStub, stub, createSandbox } from "sinon";

import { setSuccessAlert, setWarningAlert } from "../actions";
import { getWithRetry2 } from "../util";

describe("feedback util", () => {
  let requestStub: SinonStub;
  let dispatchStub: SinonStub;
  const sandbox = createSandbox();
  const mockCannotFindAddressError = Object.freeze({
    code: "ENOTFOUND",
    config: {},
    message: "getaddrinfo ENOTFOUND stg-aics.corp.alleninstitute.org",
    name: "Error",
  });
  beforeEach(() => {
    requestStub = stub();
    dispatchStub = stub();
    const setTimeoutStub = (stub().callsArg(0) as any) as typeof setTimeout;
    sandbox.replace(global, "setTimeout", setTimeoutStub);
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("getWithRetry2", () => {
    it("does not retry if response is OK", async () => {
      const resp = {};
      requestStub.resolves(resp);
      const result = await getWithRetry2(requestStub, dispatchStub);
      expect(dispatchStub.called).to.be.false;
      expect(requestStub.callCount).to.equal(1);
      expect(result).to.equal(resp);
    });
    it("throws error if response is not OK", () => {
      requestStub.rejects(new Error("foo"));
      expect(getWithRetry2(requestStub, dispatchStub)).to.be.rejectedWith(
        Error
      );
    });
    it("does not retry if response is not Bad Gateway or VPN error", async () => {
      requestStub.rejects(new Error("foo"));
      try {
        await getWithRetry2(requestStub, dispatchStub);
      } catch (e) {
        expect(dispatchStub.called).to.be.false;
        expect(requestStub.callCount).to.equal(1);
      }
    });
    it("retries if response is Bad Gateway", async () => {
      const response = {};
      requestStub
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject({
            response: {
              status: 502,
            },
          });
        })
        .onSecondCall()
        .resolves(response);

      const resp = await getWithRetry2(requestStub, dispatchStub);

      expect(
        dispatchStub.calledWithMatch(
          setWarningAlert(
            "Could not contact server. Make sure services are running."
          )
        )
      ).to.be.true;
      expect(dispatchStub.calledWithMatch(setSuccessAlert("Success!"))).to.be
        .true;
      expect(requestStub.callCount).to.equal(2);
      expect(resp).to.equal(response);
    });
    it("retries if response is VPN error", async function () {
      const response = {};
      requestStub
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject(mockCannotFindAddressError);
        })
        .onSecondCall()
        .resolves(response);

      const resp = await getWithRetry2(requestStub, dispatchStub);
      expect(
        dispatchStub.calledWithMatch(
          setWarningAlert("Services might be down. Retrying request...")
        )
      ).to.be.true;
      expect(dispatchStub.calledWithMatch(setSuccessAlert("Success!"))).to.be
        .true;
      expect(requestStub.callCount).to.equal(2);
      expect(resp).to.equal(response);
    });
    it("stops retrying after 5 tries", async () => {
      requestStub.rejects(mockCannotFindAddressError);
      try {
        await getWithRetry2(requestStub, dispatchStub);
      } catch (e) {
        expect(requestStub.callCount).to.equal(5);
      }
    });
  });
});
