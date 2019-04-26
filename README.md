# File Upload App

Desktop client application to the File Storage Service. Uploads files to the network
and saves metadata about the files. 

## Development

NOTE:
We're using `electron-builder` to package the app into OS-specific distributables.
This npm package strongly recommends using yarn for dependency management. If you don't have
yarn already, set it up by following these instructions:

https://yarnpkg.com/en/docs/install#debian-stable

Then clone the repo, install the dependencies, and run the dev server:

```bash
git clone ssh://git@aicsbitbucket.corp.alleninstitute.org:7999/sw/file-upload-app.git
cd file-upload-app
./gradlew yarn
./gradlew dev
```

## Run Tests

```bash
./gradlew test
```

## Run Linter

```bash
./gradlew lint
```

## Packaging

Use the various bundle gradle tasks available to package the app for both Windows and Linux. 

| Environment | LIMS URL                         | Gradle Command             |
| ----------- | -------------------------------- |----------------------------|
| Production  | aics.corp.alleninstitute.org     | ./gradlew prodBundle       |
| Staging     | stg-aics.corp.alleninstitute.org | ./gradlew stageBundle      |
| Development | localhost:8080                   | ./gradlew devBundle        |

We accomplish packaging for both Windows and Linux thanks to the docker image provided by `electron-builder`: electronuserland/builder:wine
which provides the dependencies needed.

## Mirroring

The mirror for this repo is at https://github.com/aicsgithub/aics-file-upload-app in order to
enable electron packaging on Cirrus CI.
