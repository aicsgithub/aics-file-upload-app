import { expect } from "chai";
import {
  match,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import JobStatusClient from "../../job-status-client";
import { JSSJobStatus } from "../../job-status-client/types";
import { StepExecutor } from "../helpers/step-executor";
import { Step, StepName, UploadContext } from "../types";

import { mockJob, targetDir, uploadJobId } from "./mocks";

describe("StepExecutor", () => {
  let mockCtx: UploadContext;
  let jobStatusClient: SinonStubbedInstance<JobStatusClient>;

  beforeEach(() => {
    jobStatusClient = createStubInstance(JobStatusClient);
    mockCtx = {
      startUploadResponse: {
        jobId: uploadJobId,
        uploadDirectory: targetDir,
      },
      uploadJobName: "",
      uploads: {
        "/path/to/file": {
          customMetadata: { annotations: [], templateId: 1 },
          file: {
            fileType: "other",
            originalPath: "/path/to/file",
          },
        },
      },
    };
  });

  const getStepAndStubs = (
    status: JSSJobStatus,
    startStub: SinonStub = stub().resolves(mockCtx),
    skipStub: SinonStub = stub().returns(mockCtx),
    endStub: SinonStub = stub().resolves(mockCtx)
  ): {
    endStub: SinonStub;
    skipStub: SinonStub;
    startStub: SinonStub;
    step: Step;
  } => {
    const step: Step = {
      job: { ...mockJob, status },
      name: StepName.CopyFiles,
      start: startStub,
      skip: skipStub,
      end: endStub,
    };
    return {
      endStub,
      skipStub,
      startStub,
      step,
    };
  };

  describe("executeSteps", () => {
    it("Returns the result of calling start on the last step if waiting/failed", async () => {
      const mockCtx3 = {
        sourceFiles: { "/path1": { md5hex: "fakehash3" } },
      };
      const { step: step1 } = getStepAndStubs(JSSJobStatus.WAITING);
      const { step: step2 } = getStepAndStubs(JSSJobStatus.FAILED);
      const { step: step3 } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().resolves(mockCtx3)
      );
      const ctx = await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step1, step2, step3],
        mockCtx
      );
      expect(ctx.sourceFiles).to.equal(mockCtx3.sourceFiles);
    });
    it("If first step has already ran successfully, the output of skip is used to execute next step", async () => {
      const mockCtx3 = {
        sourceFiles: { "/path1": { md5hex: "fakehash3" } },
      };
      const { step: step1 } = getStepAndStubs(
        JSSJobStatus.SUCCEEDED,
        undefined,
        stub().resolves(mockCtx3)
      );
      const { startStub, step: step2 } = getStepAndStubs(JSSJobStatus.WAITING);
      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step1, step2],
        mockCtx
      );
      expect(startStub.calledWith(mockCtx3)).to.be.true;
    });
    it("updates status of step's job to WORKING if the status was previously WAITING", async () => {
      const { step } = getStepAndStubs(JSSJobStatus.WAITING);
      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(
        jobStatusClient.updateJob.calledWith(
          mockJob.jobId,
          match.has("status", JSSJobStatus.WORKING)
        )
      ).to.be.true;
    });
    it("updates upload job's current stage with name of the current step if step is WAITING", async () => {
      const { step } = getStepAndStubs(JSSJobStatus.WAITING);
      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(
        jobStatusClient.updateJob.calledWith(
          uploadJobId,
          match.has("currentStage", step.name)
        )
      );
    });
    it("updates upload job's current stage with name of the current step if step is FAILED", async () => {
      const { step } = getStepAndStubs(JSSJobStatus.FAILED);
      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(
        jobStatusClient.updateJob.calledWith(
          uploadJobId,
          match.has("currentStage", step.name)
        )
      );
    });
    it("updates status of step's job to RETRYING if the status was previously FAILED", async () => {
      const { step } = getStepAndStubs(JSSJobStatus.FAILED);
      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(
        jobStatusClient.updateJob.calledWith(
          mockJob.jobId,
          match.has("status", JSSJobStatus.RETRYING)
        )
      ).to.be.true;
    });
    it("updates status of step's job to FAILED if the step throws an exception", async () => {
      const { step } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().rejects(new Error("Mock error"))
      );
      expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);

      await expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith("Mock error");

      expect(jobStatusClient.updateJob).to.have.been.calledWith(mockJob.jobId, {
        status: JSSJobStatus.FAILED,
        serviceFields: {
          error: "Mock error",
        },
      });
    });
    it("executes step.end if step.start resolves", async () => {
      const { endStub, step } = getStepAndStubs(JSSJobStatus.WAITING);
      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(endStub.calledOnce).to.be.true;
    });
    it("throws error if a step is blocked", () => {
      const { step } = getStepAndStubs(JSSJobStatus.BLOCKED);
      expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);
    });
    it("throws error if a step is retrying", () => {
      const { step } = getStepAndStubs(JSSJobStatus.RETRYING);
      expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);
    });
    it("throws error if a step is working", () => {
      const { step } = getStepAndStubs(JSSJobStatus.WORKING);
      expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);
    });
    it("Does not execute next step if last step was not ended properly", async () => {
      const {
        endStub: endStub1,
        startStub: startStub1,
        step: waitingStep1,
      } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().resolves(),
        stub().resolves(),
        stub().rejects()
      );
      const { startStub: startStub2, step: waitingStep2 } = getStepAndStubs(
        JSSJobStatus.WAITING
      );

      await expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [waitingStep1, waitingStep2],
          mockCtx
        )
      ).to.have.been.rejected;
      expect(startStub1).to.have.been.called;
      expect(endStub1).to.have.been.called;
      expect(startStub2).not.to.have.been.called;
    });
    it("skips the steps that are succeeded, runs start/end for steps that are failed or waiting", async () => {
      const {
        skipStub: succeededSkipStub,
        step: suceededStep,
      } = getStepAndStubs(JSSJobStatus.SUCCEEDED);
      const {
        endStub: waitingEndStub,
        startStub: waitingStartStub,
        step: waitingStep,
      } = getStepAndStubs(JSSJobStatus.WAITING);
      const {
        endStub: failedEndStub,
        startStub: failedStartStub,
        step: failedStep,
      } = getStepAndStubs(JSSJobStatus.FAILED);

      await StepExecutor.executeSteps(
        (jobStatusClient as any) as JobStatusClient,
        [suceededStep, waitingStep, failedStep],
        mockCtx
      );
      expect(succeededSkipStub.calledOnce).to.be.true;
      expect(waitingEndStub.calledOnce).to.be.true;
      expect(waitingStartStub.calledOnce).to.be.true;
      expect(failedEndStub.calledOnce).to.be.true;
      expect(failedStartStub.calledOnce).to.be.true;
    });

    it("doesn't run step.end if step fails", async () => {
      const { endStub, startStub, step } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().rejects()
      );

      await expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.have.been.rejected;
      expect(startStub).to.have.been.called;
      expect(endStub).not.to.have.been.called;
    });
  });

  describe("executeStepsInParallel", () => {
    it("returns promise of upload contexts", async () => {
      const mockCtx1 = {
        sourceFiles: { "/path1": { md5hex: "fakehash1" } },
      };
      const mockCtx2 = {
        sourceFiles: { "/path2": { md5hex: "fakehash2" } },
      };
      const mockCtx3 = {
        sourceFiles: { "/path3": { md5hex: "fakehash3" } },
      };
      const { step: step1 } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().resolves(mockCtx1)
      );
      const { step: step2 } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().resolves(mockCtx2)
      );
      const { step: step3 } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().resolves(mockCtx3)
      );
      const uploadContexts = await StepExecutor.executeStepsInParallel(
        (jobStatusClient as any) as JobStatusClient,
        [step1, step2, step3],
        mockCtx
      );
      expect(uploadContexts.length).to.equal(3);
      expect(uploadContexts[0]).to.equal(mockCtx1);
      expect(uploadContexts[1]).to.equal(mockCtx2);
      expect(uploadContexts[2]).to.equal(mockCtx3);
    });
    it("updates status of step's job to WORKING if the status was previously WAITING", async () => {
      const { step } = getStepAndStubs(JSSJobStatus.WAITING);
      await StepExecutor.executeStepsInParallel(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(
        jobStatusClient.updateJob.calledWith(
          mockJob.jobId,
          match.has("status", JSSJobStatus.WORKING)
        )
      ).to.be.true;
    });

    it("updates status of step's job to RETRYING if the status was previously FAILED", async () => {
      const { step } = getStepAndStubs(JSSJobStatus.FAILED);
      await StepExecutor.executeStepsInParallel(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(
        jobStatusClient.updateJob.calledWith(
          mockJob.jobId,
          match.has("status", JSSJobStatus.RETRYING)
        )
      ).to.be.true;
    });

    it("updates status of step's job to FAILED if the step throws an exception", async () => {
      const { step } = getStepAndStubs(
        JSSJobStatus.WAITING,
        stub().rejects(new Error("Mock error"))
      );
      await expect(
        StepExecutor.executeStepsInParallel(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);

      await expect(
        StepExecutor.executeSteps(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith("Mock error");
      expect(jobStatusClient.updateJob).to.have.been.calledWith(mockJob.jobId, {
        status: JSSJobStatus.FAILED,
        serviceFields: { error: "Mock error" },
      });
    });

    it("executes step.end if step.start resolves", async () => {
      const { endStub, step } = getStepAndStubs(JSSJobStatus.WAITING);
      await StepExecutor.executeStepsInParallel(
        (jobStatusClient as any) as JobStatusClient,
        [step],
        mockCtx
      );
      expect(endStub.calledOnce).to.be.true;
    });

    it("throws error if a step is blocked", () => {
      const { step } = getStepAndStubs(JSSJobStatus.BLOCKED);
      expect(
        StepExecutor.executeStepsInParallel(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);
    });

    it("throws error if a step is retrying", () => {
      const { step } = getStepAndStubs(JSSJobStatus.RETRYING);
      expect(
        StepExecutor.executeStepsInParallel(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);
    });

    it("throws error if a step is working", () => {
      const { step } = getStepAndStubs(JSSJobStatus.WORKING);
      expect(
        StepExecutor.executeStepsInParallel(
          (jobStatusClient as any) as JobStatusClient,
          [step],
          mockCtx
        )
      ).to.be.rejectedWith(Error);
    });

    it("skips the steps that are succeeded, runs start/end for steps that are failed or waiting", async () => {
      const {
        skipStub: succeededSkipStub,
        step: suceededStep,
      } = getStepAndStubs(JSSJobStatus.SUCCEEDED);
      const {
        endStub: waitingEndStub,
        startStub: waitingStartStub,
        step: waitingStep,
      } = getStepAndStubs(JSSJobStatus.WAITING);
      const {
        endStub: failedEndStub,
        startStub: failedStartStub,
        step: failedStep,
      } = getStepAndStubs(JSSJobStatus.FAILED);

      await StepExecutor.executeStepsInParallel(
        (jobStatusClient as any) as JobStatusClient,
        [suceededStep, waitingStep, failedStep],
        mockCtx
      );
      expect(succeededSkipStub.calledOnce).to.be.true;
      expect(waitingEndStub.calledOnce).to.be.true;
      expect(waitingStartStub.calledOnce).to.be.true;
      expect(failedEndStub.calledOnce).to.be.true;
      expect(failedStartStub.calledOnce).to.be.true;
    });
  });
});
