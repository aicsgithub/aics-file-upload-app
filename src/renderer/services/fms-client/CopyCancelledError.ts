export class CopyCancelledError extends Error {
  constructor() {
    super("File copy cancelled by user.");
    this.name = "CopyCancelledError";
  }
}
