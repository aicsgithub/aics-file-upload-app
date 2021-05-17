import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

import Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { Cancelable } from "lodash";

import { CopyError } from "../errors";
import { AICSFILES_LOGGER } from "../util";

type OnCopyProgressCallback = (
  filePath: string,
  bytesCopied: number,
  totalBytes: number
) => void;
type GetCopyWorkerCallback = () => Worker;

enum Platform {
  WINDOWS = "win32",
  MAC = "darwin",
}

export enum CopyStep {
  SUCCESS = "worker-success",
  IN_PROGRESS = "upload-progress",
}

export default class Copier {
  private readonly logger: ILogger = Logger.get(AICSFILES_LOGGER);
  private readonly getCopyWorker: GetCopyWorkerCallback;
  private readonly onCopyProgress: OnCopyProgressCallback;
  private sourceToCopyWorker: { [filePath: string]: Worker } = {};

  // Copies source file to destination folder in chunks, reports incremental progress, and returns md5
  public static async copyAndGetMD5(
    source: string,
    dest: string,
    onCopyProgress: ((progress: number) => void) & Cancelable
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Adapted from these sources:
        // MD5: https://blog.abelotech.com/posts/calculate-checksum-hash-nodejs-javascript/
        // Copy using streams: https://medium.com/dev-bits/writing-memory-efficient-software-applications-in-node-js-5575f646b67f
        const hash = createHash("md5");
        const readable = fs.createReadStream(source);
        const writeable = fs.createWriteStream(
          path.resolve(dest, path.basename(source))
        );
        let bytesCopied = 0;
        readable.on("data", (chunk) => {
          bytesCopied += chunk.length;
          onCopyProgress(bytesCopied);
          hash.update(chunk, "utf8");
        });

        readable.on("end", () => {
          // Ensure that final call to `onProgress` happens
          onCopyProgress.flush();
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
  }

  // Formats the given path to be POSIX compatible with the user's platform
  private static formatPosixPathCompatibleWithPlatform(path: string): string {
    if (process.platform === Platform.WINDOWS) {
      path = path.replace(/\//g, "\\");
      if (path.startsWith("\\allen")) {
        path = `\\${path}`;
      }
    }
    return path;
  }

  public constructor(
    getCopyWorker: GetCopyWorkerCallback,
    onCopyProgress: OnCopyProgressCallback
  ) {
    this.getCopyWorker = getCopyWorker;
    this.onCopyProgress = onCopyProgress;
  }

  // Copy the source file to the destination using a web worker.
  // Returns the MD5 hash of the file copied.
  public async copy(source: string, dest: string): Promise<string> {
    const worker = this.getCopyWorker();
    this.sourceToCopyWorker[source] = worker;
    const fileName = path.basename(source);
    const fileStat = await fs.promises.stat(source);
    const fileSize = fileStat.size;

    const formattedDest = Copier.formatPosixPathCompatibleWithPlatform(dest);

    return new Promise<string>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent) => {
        const lowerCaseMessage = e?.data.toLowerCase();
        if (lowerCaseMessage.includes(CopyStep.SUCCESS)) {
          // https://apple.stackexchange.com/questions/14980/why-are-dot-underscore-files-created-and-how-can-i-avoid-them
          if (process.platform === Platform.MAC) {
            const toRemove = path.resolve(dest, `._${fileName}`);
            try {
              this.forceRemoveRecursive.sync(toRemove);
            } catch (e) {
              this.logger.error(`Failed to remove ${toRemove}` + e.message);
            }
          }

          const md5 = lowerCaseMessage.split(":")[1];
          resolve(md5);
        } else if (lowerCaseMessage.includes(CopyStep.IN_PROGRESS)) {
          this.logger.info(e.data);
          const info = e.data.split(":");
          // worker messages for uploads will look like "upload-progress:111" where upload-progress
          // tells us what kind of message this is and 111 is the number of copied bytes
          if (info.length === 2) {
            try {
              this.onCopyProgress(source, parseInt(info[1], 10), fileSize);
            } catch (e) {
              this.logger.error("Could not parse JSON progress info", e);
            }
          } else {
            this.logger.error(
              "progress info contains insufficient amount of information"
            );
          }
        } else {
          this.logger.info(e.data);
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        this.logger.error(`Error while copying file ${source}`, e);
        reject(new CopyError(e.message));
      };

      worker.postMessage([source, formattedDest]);
    });
  }

  public cancel(filePath: string): void {
    if (this.sourceToCopyWorker[filePath]) {
      this.sourceToCopyWorker[filePath].terminate();
    }
  }
}
