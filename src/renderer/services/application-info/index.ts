import * as os from "os";

import { gt } from "semver";

import HttpCacheClient from "../http-cache-client";

interface UpdateInfo {
  currentVersion: string;
  newestVersion: string;
}

/**
 * Interface for querying information regarding the application itself and its runtime.
 */
export default class ApplicationInfoService extends HttpCacheClient {
  public static getApplicationVersion(): string {
    // Must be injected at build-time
    const applicationVersion = process.env.APPLICATION_VERSION;
    if (!applicationVersion) {
      throw new Error("APPLICATION_VERSION must be defined");
    }
    return applicationVersion;
  }

  public static getOS(): string {
    return os.type();
  }

  public static getUserName(): string {
    return os.userInfo().username;
  }

  public async checkForUpdate(): Promise<UpdateInfo | undefined> {
    const currentVersion = ApplicationInfoService.getApplicationVersion();

    let versions;
    try {
      versions = await this.get<{ name: string }[]>(
        "https://api.github.com/repos/aicsgithub/aics-file-upload-app/tags"
      );
    } catch (error) {
      throw new Error(`Failed to fetch release from GitHub: ${error.message}`);
    }

    const newestVersion = versions.reduce(
      (newestSoFar, current) =>
        gt(newestSoFar, current.name) ? newestSoFar : current.name,
      currentVersion
    );
    if (gt(newestVersion, currentVersion)) {
      return { currentVersion, newestVersion };
    }
    return undefined;
  }
}
