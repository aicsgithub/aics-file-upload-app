import { AxiosError, AxiosResponse } from "axios";
import { stub } from "sinon";

import { CreateJobRequest, JSSJob, UpdateJobRequest } from "../types";

export const mockCreateJobRequest: CreateJobRequest = {
  jobName: "Dinner",
  user: "demo",
  originationHost: "kitchen",
  status: "WAITING",
  currentStage: "started",
};

export const mockUpdateJobRequest: UpdateJobRequest = {
  currentStage: "queuing for SLURM",
  status: "WAITING",
};

export const mockJSSJob: JSSJob = {
  created: new Date("2019-06-18T15:31:45.610+0000"),
  jobId: "ae64e5c79d244d93a962aac50159ecc0",
  modified: new Date("2019-06-18T15:31:45.610+0000"),
  status: "WAITING",
  user: "demo",
};

export const makeAxiosResponse = <T>(resp: T): AxiosResponse<T> => ({
  data: resp,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
  request: {},
});

export const mockJobResponse = {
  data: [
    {
      ...mockJSSJob,
      childIds: null,
      currentHost: null,
      currentStage: "started",
      jobName: "Dinner",
      originationHost: "kitchen",
      parentId: null,
      service: null,
      serviceFields: null,
      updateParent: false,
    },
  ],
  totalCount: 1,
  offset: 0,
  responseType: "SUCCESS",
};

const axiosError: AxiosError = (stub() as any) as AxiosError;
const axiosResponse: AxiosResponse = (stub() as any) as AxiosResponse;
export const badGatewayResponse: AxiosError = {
  ...axiosError,
  response: {
    ...axiosResponse,
    status: 502,
  },
};
export const badRequestResponse: AxiosError = {
  ...axiosError,
  response: {
    ...axiosResponse,
    status: 400,
  },
};
export const internalServerError: AxiosError = {
  ...axiosError,
  response: {
    ...axiosResponse,
    status: 500,
  },
};
