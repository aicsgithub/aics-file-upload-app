export function makePosixPathCompatibleWithPlatform(
  path: string,
  platform: string
): string {
  if (platform === "win32") {
    path = path.replace(/\//g, "\\");
    if (path.startsWith("\\allen")) {
      path = `\\${path}`;
    }
  }
  return path;
}
