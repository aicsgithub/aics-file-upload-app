import {
  UPLOAD_WORKER_ON_PROGRESS,
  UPLOAD_WORKER_SUCCEEDED,
} from "../constants";

import copyFiles from "./copy-and-calc-md5";

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [originalPath, targetFolder, copyProgressCbThrottleMs] = e.data;

  try {
    const md5 = await copyFiles(
      originalPath,
      targetFolder,
      (progress: number) => {
        ctx.postMessage(`${UPLOAD_WORKER_ON_PROGRESS}:${progress}`);
      },
      copyProgressCbThrottleMs
    );
    ctx.postMessage(`${UPLOAD_WORKER_SUCCEEDED}:${md5}`);
  } catch (e) {
    ctx.postMessage(`Copy failed: ${e.message}`);
    // https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
    setTimeout(() => {
      throw e;
    }, 500);
  }
};
