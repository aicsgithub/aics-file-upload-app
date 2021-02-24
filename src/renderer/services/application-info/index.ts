import * as os from "os";

/**
 * Interface for querying information regarding the application itself and its runtime.
 */
export default class ApplicationInfoService {
  public static getApplicationVersion(): string {
    // Must be injected at build-time
    const applicationVersion = process.env.npm_package_version;
    if (!applicationVersion) {
      throw new Error("npm_package_version must be defined");
    }
    return applicationVersion;
  }

  public static getOS(): string {
    return os.type();
  }

  public static getUserName(): string {
    return os.userInfo().username;
  }
}
