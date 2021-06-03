import { createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { basename, resolve as resolvePath } from "path";

import { noop, throttle } from "lodash";

import {
  UPLOAD_WORKER_ON_PROGRESS,
  UPLOAD_WORKER_SUCCEEDED,
} from "../aicsfiles/constants";

const THROTTLE_MS = 20000;

/**
 * Copies source file to destination folder in chunks,
 * reports incremental progress, and returns md5.
 */
const copyFiles = (
  source: string,
  dest: string,
  onProgress: (progress: number) => void = noop,
  throttleMs: number = THROTTLE_MS
): Promise<string> => {
  const onProgressThrottled = throttle(onProgress, throttleMs);
  return new Promise((resolve, reject) => {
    try {
      // Adapted from these sources:
      // MD5: https://blog.abelotech.com/posts/calculate-checksum-hash-nodejs-javascript/
      // Copy using streams: https://medium.com/dev-bits/writing-memory-efficient-software-applications-in-node-js-5575f646b67f
      const hash = createHash("md5");
      const readable = createReadStream(source);
      const writeable = createWriteStream(resolvePath(dest, basename(source)));

      let bytesCopied = 0;
      readable.on("data", (chunk) => {
        bytesCopied += chunk.length;
        onProgressThrottled(bytesCopied);
        hash.update(chunk, "utf8");
      });

      readable.on("end", () => {
        // Ensure that final call to `onProgress` happens
        onProgressThrottled.flush();
        resolve(hash.digest("hex"));
      });

      // Send source bytes to destination through pipe
      readable.pipe(writeable);

      // Error cases
      readable.on("error", (e) => {
        reject(e);
      });
      writeable.on("error", (e) => {
        reject(e);
      });
      writeable.on("unpipe", (src) => {
        if (src !== readable) {
          reject(new Error(`Copy of file ${source} has been interrupted`));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

// Performs actual copy as a web worker (used in fms.copyFile)
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
