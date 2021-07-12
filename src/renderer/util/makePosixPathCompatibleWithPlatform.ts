// TODO: This function lives in its own file to avoid circular dependency issues
// caused by having it in `index.ts`. Once that file is refactored, it should
// move back in there.
export default function makePosixPathCompatibleWithPlatform(
  path: string,
  platform: string
): string {
  let updatedPath = path;
  // Replace forward-slashes with back-slashes on Windows
  if (platform === "win32") {
    updatedPath = path.replace(/\//g, "\\");
    if (updatedPath.startsWith("\\allen")) {
      updatedPath = `\\${updatedPath}`;
    }
  }
  return updatedPath;
}
