import { FileManagementSystem } from "@aics/aicsfiles";

import {
  UPLOAD_WORKER_ON_PROGRESS,
  UPLOAD_WORKER_SUCCEEDED,
} from "./constants";

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [job, fileNames, host, port, username] = e.data;
  const copyProgress = new Map();
  fileNames.forEach((fileName: string) => {
    copyProgress.set(fileName, 0);
  });
  // updates copyProgress
  const onCopyProgress = (
    originalFilePath: string,
    bytesCopied: number,
    totalBytes: number
  ) => {
    copyProgress.set(originalFilePath, bytesCopied);
    let totalBytesCopied = 0;
    copyProgress.forEach((value: number) => {
      totalBytesCopied += value;
    });
    ctx.postMessage(
      `${UPLOAD_WORKER_ON_PROGRESS}:${totalBytesCopied}:${totalBytes}`
    );
  };
  ctx.postMessage("Web worker retrying upload");
  try {
    const fms = new FileManagementSystem({ host, port, username });
    await fms.retryUpload(job, onCopyProgress, 5000);
    ctx.postMessage(UPLOAD_WORKER_SUCCEEDED);
  } catch (e) {
    ctx.postMessage(`Retry upload failed: ${e.message}`);
    // https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
    setTimeout(() => {
      throw e;
    }, 500);
  }
};
