import { createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { basename, resolve as resolvePath } from "path";

import { noop, throttle } from "lodash";

const THROTTLE_MS = 20000;

/**
 * Copies source file to destination folder in chunks, reports incremental progress, and returns md5
 * @param source filepath
 * @param dest folder to copy to
 * @param onProgress optional callback that gets called every ~20 seconds.
 * @param throttleMs minimum milliseconds between each onProgress call
 */
const copyAndGetMD5 = (
  source: string,
  dest: string,
  onProgress: (progress: number) => void = noop,
  throttleMs: number = THROTTLE_MS
): Promise<string> => {
  onProgress = throttle(onProgress, throttleMs);
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
        onProgress(bytesCopied);
        hash.update(chunk, "utf8");
      });

      readable.on("end", () => {
        resolve(hash.digest("hex"));
      });

      readable.pipe(writeable);

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
export default copyAndGetMD5;
