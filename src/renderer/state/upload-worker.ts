import { FileManagementSystem } from "@aics/aicsfiles";

import {
  UPLOAD_WORKER_ON_PROGRESS,
  UPLOAD_WORKER_SUCCEEDED,
} from "./constants";

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [startUploadResponse, payload, jobName, host, port, username] = e.data;
  ctx.postMessage("Web worker starting upload");
  const copyProgress = Object.keys(payload).reduce(
    (accum: { [originalPath: string]: number }, filePath) => {
      return {
        ...accum,
        [filePath]: 0,
      };
    },
    {}
  );

  // updates copyProgress
  const onCopyProgress = (
    originalFilePath: string,
    bytesCopied: number,
    totalBytes: number
  ) => {
    copyProgress[originalFilePath] = bytesCopied;
    const totalBytesCopied = Object.values(copyProgress).reduce(
      (totalCopied: number, curr: number) => totalCopied + curr,
      0
    );
    const percentCopied = (totalBytesCopied / totalBytes) * 100;
    ctx.postMessage(`${UPLOAD_WORKER_ON_PROGRESS}:${percentCopied}`);
  };
  try {
    const fms = new FileManagementSystem({ host, port, username });
    await fms.uploadFiles(
      startUploadResponse,
      payload,
      jobName,
      onCopyProgress
    );
    ctx.postMessage(UPLOAD_WORKER_SUCCEEDED);
  } catch (e) {
    ctx.postMessage(`Upload failed: ${e.message}`);
    // https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
    setTimeout(() => {
      throw e;
    }, 500);
  }
};
