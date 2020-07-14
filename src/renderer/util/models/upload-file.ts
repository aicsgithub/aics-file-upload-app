import { readdir as fsReaddir, stat as fsStat, Stats } from "fs";
import { basename, dirname, resolve as resolvePath } from "path";
import { promisify } from "util";

import { UploadFile } from "../../state/types";
import { canUserRead } from "../index";

const readdir = promisify(fsReaddir);
const stat = promisify(fsStat);

export class UploadFileImpl implements UploadFile {
  public name: string;
  public path: string;
  // this will get populated once the folder is expanded
  public files: UploadFile[] = [];
  public readonly isDirectory: boolean;
  public readonly canRead: boolean;

  constructor(
    name: string,
    path: string,
    isDirectory: boolean,
    canRead: boolean
  ) {
    this.name = name;
    this.path = path;
    this.isDirectory = isDirectory;
    this.canRead = canRead;
  }

  get fullPath(): string {
    return resolvePath(this.path, this.name);
  }

  public async loadFiles(): Promise<Array<Promise<UploadFile>>> {
    if (!this.isDirectory) {
      return Promise.reject("Not a directory");
    }
    const fullPath = resolvePath(this.path, this.name);
    if (!this.canRead) {
      return Promise.reject(
        `You do not have permission to view this file/directory: ${fullPath}.`
      );
    }

    const files: string[] = await readdir(this.fullPath);
    return files.map(async (file: string) => {
      const filePath = resolvePath(this.fullPath, file);
      const stats: Stats = await stat(filePath);
      const canRead = await canUserRead(filePath);
      return new UploadFileImpl(
        basename(filePath),
        dirname(filePath),
        stats.isDirectory(),
        canRead
      );
    });
  }
}
