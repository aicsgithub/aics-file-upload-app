import { FileManagementSystem } from "../services/aicsfiles";

import { UPLOAD_WORKER_SUCCEEDED } from "./constants";
import { getCopyProgressCb } from "./util";

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [startUploadResponse, payload, jobName, host, port, username] = e.data;
  ctx.postMessage("Web worker starting upload");
  try {
    const fms = new FileManagementSystem({ host, port, username });
    await fms.uploadFiles(
      startUploadResponse,
      payload,
      jobName,
      getCopyProgressCb(Object.keys(payload), ctx.postMessage.bind(ctx)),
      2000
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
