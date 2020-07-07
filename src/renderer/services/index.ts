export { default as LabKeyClient } from "./labkey-client";
export { default as MMSClient } from "./mms-client";

export interface LocalStorage {
  clear: () => void;
  delete: (key: string) => void;
  get: (key: string) => any;
  has: (key: string) => boolean;
  set: (key: string, value: any) => void;
}
