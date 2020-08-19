import { FileManagementSystem } from "@aics/aicsfiles";

import { UPLOAD_WORKER_SUCCEEDED } from "./constants";
import { getCopyProgressCb } from "./util";

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [job, fileNames, host, port, username] = e.data;
  ctx.postMessage("Web worker retrying upload");
  try {
    const fms = new FileManagementSystem({ host, port, username });
    await fms.retryUpload(
      job,
      getCopyProgressCb(fileNames, ctx.postMessage.bind(ctx)),
      2000
    );
    ctx.postMessage(UPLOAD_WORKER_SUCCEEDED);
  } catch (e) {
    ctx.postMessage(`Retry upload failed: ${e.message}`);
    // https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
    setTimeout(() => {
      throw e;
    }, 500);
  }
};
