import { FileManagementSystem } from "@aics/aicsfiles";

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
  const fms = new FileManagementSystem({ host, port, username });
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
    ctx.postMessage(`percent copied:${percentCopied}`);
  };
  try {
    await fms.uploadFiles(
      startUploadResponse,
      payload,
      jobName,
      onCopyProgress
    );
    ctx.postMessage("Upload success!");
  } catch (e) {
    ctx.postMessage(`Upload failed: ${e.message}`);
    // https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
    setTimeout(() => {
      throw e;
    }, 500);
  }
};
