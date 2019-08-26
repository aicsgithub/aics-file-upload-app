import {
    access as fsAccess,
    constants,
    readdir as fsReaddir,
    stat as fsStat,
    Stats
} from "fs";
import { basename, dirname, resolve as resolvePath } from "path";
import { promisify } from "util";

import { UploadFile } from "../types";

const access = promisify(fsAccess);
const readdir = promisify(fsReaddir);
const stat = promisify(fsStat);

export class UploadFileImpl implements UploadFile {
    public name: string;
    public path: string;
    // this will get populated once the folder is expanded
    public files: UploadFile[] = [];
    public readonly isDirectory: boolean;

    constructor(name: string, path: string, isDirectory: boolean) {
        this.name = name;
        this.path = path;
        this.isDirectory = isDirectory;
    }

    get fullPath(): string {
        return resolvePath(this.path, this.name);
    }

    public async loadFiles(): Promise<Array<Promise<UploadFile>>> {
        if (!this.isDirectory) {
            return Promise.reject("Not a directory");
        }
        const fullPath = resolvePath(this.path, this.name);
        try {
            await access(fullPath, constants.R_OK);
        } catch (permissionError) {
            throw new Error(`You do not have permission to view this file/directory: ${fullPath}.`);
        }

        const files: string[] = await readdir(this.fullPath);
        return files.map(async (file: string) => {
            const filePath = resolvePath(this.fullPath, file);
            const stats: Stats = await stat(filePath);
            return new UploadFileImpl(basename(filePath), dirname(filePath), stats.isDirectory());
        });
    }
}
