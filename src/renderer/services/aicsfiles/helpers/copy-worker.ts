import { throttle } from "lodash";

import Copier, { CopyStep } from "./copier";

// Time between copy progress updates in milliseconds
const COPY_PROGRESS_THROTTLE = 5000;

const ctx: Worker = self as any;
ctx.onmessage = async (e: MessageEvent) => {
  const [source, dest] = e.data;

  try {
    const onProgress = (progress: number): void => {
      ctx.postMessage(`${CopyStep.IN_PROGRESS}:${progress}`);
    };
    const onProgressThrottled = throttle(onProgress, COPY_PROGRESS_THROTTLE);
    const md5 = await Copier.copyAndGetMD5(source, dest, onProgressThrottled);
    ctx.postMessage(`${CopyStep.SUCCESS}:${md5}`);
  } catch (e) {
    ctx.postMessage(`Copy failed: ${e.message}`);
    // https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
    setTimeout(() => {
      throw e;
    }, 500);
  }
};
