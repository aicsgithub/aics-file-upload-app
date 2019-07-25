# File Upload App

Desktop client application to the File Storage Service. Uploads files to the network
and saves metadata about the files. 

## Development

NOTE:
We're using `electron-builder` to package the app into OS-specific distributables.
This npm package strongly recommends using yarn for dependency management. If you don't have
yarn already, set it up by following these instructions:

https://yarnpkg.com/en/docs/install#debian-stable

Then clone the repo, install the dependencies, and run the dev server against staging:

```bash
git clone ssh://git@aicsbitbucket.corp.alleninstitute.org:7999/sw/file-upload-app.git
cd file-upload-app
./gradlew yarn
./gradlew devStg
```

## Run Tests

```bash
./gradlew test
```

## Run Linter

```bash
./gradlew lint
```

## Packaging and Publishing

We are packaging the app for Windows, Linux, and Mac platforms using electron-builder on Travis CI.
Artifacts are sent to S3 and are available for download for all users using the Institute network (but not through VPN).

We accomplish packaging for both Windows and Linux using the docker image: electronuserland/builder:wine
which provides the dependencies needed on a Linux system to build the app for both Linux and Windows.

Travis CI will package and publish a new version of the app for all tagged commits of the form /^\d+\.\d+\.\d+(-\S*)?$/.
For example, these will all get built:

1.0.5
1.21.5
1.0.5-snapshot
1.0.5-feature-autoupdate


### Release workflow

Before releasing an official version of the app, you'll want to test the packaged app on all platforms. To create a
snapshot build:

1. Update the version in package.json. This will be used for naming the artifact:
```json
 "version": "1.0.5-snapshot",
```
2. Commit, tag, and push
```bash
git add package.json
git commit -m "create snapshot"
git tag 1.0.5-snapshot
git push origin 1.0.5-snapshot
```
 
For official versions of the app, first revert the version back to the pre-snapshot version in package.json (on master).
Then update VERSION_NOTES.md and update the version using the following commands:

```bash
git add .
git commit -m "update version"
npm version patch
git push
```

## Mirroring

The mirror for this repo is at https://github.com/aicsgithub/aics-file-upload-app in order to
enable electron packaging on Cirrus CI.
