export interface JobBase<T = any> {
  // Array of child ids of this job.  Optional, supplied by client
  childIds?: string[];

  // Name of the most recent host to update the status of the job.  Optional, supplied by client
  currentHost?: string;

  // The name of the current stage of the job, for processes that want to track more than status.
  // Optional, supplied by client
  currentStage?: string;

  // Human friendly name of the job, if any. Optional, supplied by client
  jobName?: string;

  // Host that created the job.  Optional, supplied by client
  originationHost?: string;

  // Id of the parent job, or parent process, of this job (if any).  Optional, supplied by client
  parentId?: string;

  // Name of the service that created or owns this job.  Optional, supplied by client
  service?: string;

  // Additional properties required by a specific job or job type.  Optional, supplied by client
  serviceFields?: T;

  // The status of this job.  Required, supplied by client.
  status: JSSJobStatus;

  // If this value is set, and the job has a parent_id, when the status of this job is changed,
  // the parent will be checked for a possible update; if all the children are advanced to a given status,
  // the parent will be advanced.  Optional, supplied by client
  updateParent?: boolean;

  // Identifier for the user associated with the job.  Required, supplied by client.
  user: string;
}

export interface CreateJobRequest<T = any> extends JobBase<T> {
  // Unique ID of the job. May be supplied by the client, or will be created by JSS
  jobId?: string;
}

export interface UpdateJobRequest {
  jobName?: string;

  // Array of child ids of this job.
  childIds?: string[];

  // Additional properties required by a specific job or job type.
  serviceFields?: any;

  // Name of the most recent host to update the status of the job.
  currentHost?: string;

  // The name of the current stage of the job, for processes that want to track more than status.
  currentStage?: string;

  // The status of this job.
  status?: JSSJobStatus;
}

export interface JSSUpdateJobRequest extends JSSServiceFields {
  jobName?: string;
  childIds?: string[];
  currentHost?: string;
  currentStage?: string;
  status?: JSSJobStatus;
}

export interface AsyncJSSJob<T = any> extends JobBase<T> {
  // Unique ID of the job as supplied by the client.
  jobId: string;
}

export interface JSSJob<T = any> extends JobBase<T> {
  // Datestamp for when the job was originally created.  Required, created by JSS
  created: Date;

  // Unique ID of the job. May be supplied by the client, or will be created by JSS
  jobId: string;

  // Datestamp for when the job was last modified.  Required, created by JSS
  modified: Date;
}

export interface JobQuery {
  created?: Date | MongoFieldQuery;
  jobId?: string | MongoFieldQuery;
  modified?: Date | MongoFieldQuery;
  childIds?: string[] | MongoFieldQuery;
  currentHost?: string | MongoFieldQuery;
  currentStage?: string | MongoFieldQuery;
  jobName?: string | MongoFieldQuery;
  originationHost?: string | MongoFieldQuery;
  parentId?: string | MongoFieldQuery;
  service?: string | MongoFieldQuery;
  serviceFields?: any;
  status?: JSSJobStatus | MongoFieldQuery;
  updateParent?: boolean | MongoFieldQuery;
  user: string | MongoFieldQuery;
  [id: string]: any;
}

export interface MongoFieldQuery {
  $gt?: any;
  $gte?: any;
  $in?: any;
  $lt?: any;
  $lte?: any;
  $ne?: any;
  $nin?: any;
}

export enum JSSJobStatus {
  UNRECOVERABLE = "UNRECOVERABLE",
  FAILED = "FAILED",
  WORKING = "WORKING",
  RETRYING = "RETRYING",
  WAITING = "WAITING",
  BLOCKED = "BLOCKED",
  SUCCEEDED = "SUCCEEDED",
}

export const SUCCESSFUL_STATUS = JSSJobStatus.SUCCEEDED;
export const FAILED_STATUSES = [
  JSSJobStatus.FAILED,
  JSSJobStatus.UNRECOVERABLE,
];
export const IN_PROGRESS_STATUSES = [
  JSSJobStatus.BLOCKED,
  JSSJobStatus.RETRYING,
  JSSJobStatus.WAITING,
  JSSJobStatus.WORKING,
];

export type BasicType = boolean | number | string | Date | undefined | null;
export interface JSSServiceFields {
  [key: string]: any;
}
