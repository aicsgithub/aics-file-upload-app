import { createHash, Hash } from "crypto";
import {
  createReadStream,
  createWriteStream,
  ReadStream,
  WriteStream,
} from "fs";
import { basename, resolve as resolvePath } from "path";
import { Transform, pipeline } from "stream";

import { CopyCancelledError } from "./CopyCancelledError";

// Encapsulates logic and streams related to copying files and calculating MD5 hashes
export default class FileCopier {
  private jobIdToStreamMap: {
    [jobId: string]: {
      readStream: ReadStream;
      writeStream: WriteStream;
      progressStream: Transform;
      hashStream: Hash;
    };
  } = {};

  // Copies the file located at `source` to `dest`, and returns the calculated
  // MD5. Calls `onProgress` whenever a chunk of data is copied.
  public async copyToDestAndCalcMD5(
    jobId: string,
    source: string,
    dest: string,
    onProgress: (bytesCopied: number) => void
  ): Promise<string> {
    let bytesCopied = 0;
    const readStream = createReadStream(source);
    const hashStream = createHash("md5").setEncoding("hex");
    const writeStream = createWriteStream(resolvePath(dest, basename(source)));
    // This is a dummy stream to track the progress of the copy
    const progressStream = new Transform({
      transform(chunk, encoding, callback) {
        bytesCopied += chunk.length;
        onProgress(bytesCopied);
        this.push(chunk);
        callback();
      },
    });

    this.jobIdToStreamMap[jobId] = {
      readStream,
      writeStream,
      hashStream,
      progressStream,
    };

    // TODO: Replace this with the built-in promise version of `pipeline` once
    // we are on Node v15+.
    // https://nodejs.org/api/stream.html#stream_stream_pipeline_streams_callback
    const copyPromise = new Promise((resolve, reject) => {
      // Send source bytes to destination and track progress
      pipeline(readStream, progressStream, writeStream, (error) => {
        if (error) {
          delete this.jobIdToStreamMap[jobId];
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const md5CalcPromise = new Promise((resolve, reject) => {
      // Calculate MD5
      pipeline(readStream, hashStream, (error) => {
        if (error) {
          delete this.jobIdToStreamMap[jobId];
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Wait for copy and MD5 calculation to complete
    await Promise.all([copyPromise, md5CalcPromise]);

    delete this.jobIdToStreamMap[jobId];
    // Return calculated MD5
    return hashStream.read();
  }

  // Stops the file copy and destroys all of the related streams.
  public cancelCopy(jobId: string) {
    if (jobId in this.jobIdToStreamMap) {
      const {
        readStream,
        writeStream,
        hashStream,
        progressStream,
      } = this.jobIdToStreamMap[jobId];
      readStream.unpipe();
      const cancelledError = new CopyCancelledError();
      readStream.destroy(cancelledError);
      writeStream.destroy(cancelledError);
      hashStream.destroy(cancelledError);
      progressStream.destroy(cancelledError);
      delete this.jobIdToStreamMap[jobId];
    }
  }
}
