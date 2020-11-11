pipeline {
    options {
        disableConcurrentBuilds()
        timeout(time: 1, unit: "HOURS")
    }
    agent {
        node {
            label "electron"
        }
    }
    triggers {
        // Every 15 minutes from 8am through 6pm on Monday through Friday
        // https://cron.help/
        pollSCM("*/15 * * * 1-5")
    }
    environment {
        PATH = "/home/jenkins/.local/bin:$PATH"
        REQUESTS_CA_BUNDLE = "/etc/ssl/certs"
        JAVA_HOME = "/usr/lib/jvm/jdk-10.0.2"
        VENV_BIN = "/local1/virtualenvs/jenkinstools/bin"
        PYTHON = "${VENV_BIN}/python3"
    }
    parameters {
        booleanParam(name: "INCREMENT_VERSION", defaultValue: false, description: "Whether or not to increment version as part of this build. Note that this can only be done on master.")
        choice(name: "VERSION_TO_INCREMENT", choices: ["patch", "minor", "major", "prerelease"], description: "Which part of the npm version to increment. Select 'prerelease' to create a snapshot.")
    }
    stages {
        stage ("initialize build") {
           when {
                expression { return !skipBuild(params) }
           }
            steps {
                this.notifyBB("INPROGRESS")
                echo "${BRANCH_NAME}"

                git url: "${env.GIT_URL}", branch: "${env.BRANCH_NAME}", credentialsId:"9b2bb39a-1b3e-40cd-b1fd-fee01ebef965"
            }
        }
        stage ("lint, circular-dependencies, test, build") {
            when {
                expression { return !skipBuild(params) }
            }
            steps {
                sh "./gradlew -i yarn lint detectCircularDeps test compile"
            }
        }
        stage ("version - release") {
            when {
                expression {
                    return skipBuild(params) && env.BRANCH_NAME == "master" && params.VERSION_TO_INCREMENT != "prerelease"
                }
            }
            steps {
                sh "./gradlew -i yarn_version_--${VERSION_TO_INCREMENT}"
                sh "git push -u origin master && git push --tags"
            }
        }
        stage ("version - snapshot") {
            when {
                expression {
                    return skipBuild(params) && params.VERSION_TO_INCREMENT == "prerelease"
                }
            }
            steps {
                sh "./gradlew -i createSnapshot"
                sh "git pull origin ${env.BRANCH_NAME} && git push -u origin ${env.BRANCH_NAME} && git push --tags"
            }
        }
    }
    post {
        always {
            this.notifyBB(currentBuild.result)
        }
        cleanup {
            sh "./gradlew -i  artifactClean"
        }
    }
}

def notifyBB(String state) {
    // on success, result is null
    state = state ?: "SUCCESS"

    if (state == "SUCCESS" || state == "FAILURE") {
        currentBuild.result = state
    }

    notifyBitbucket commitSha1: "${GIT_COMMIT}",
            credentialsId: "aea50792-dda8-40e4-a683-79e8c83e72a6",
            disableInprogressNotification: false,
            considerUnstableAsSuccess: true,
            ignoreUnverifiedSSLPeer: false,
            includeBuildNumberInKey: false,
            prependParentProjectKey: false,
            projectKey: "SW",
            stashServerBaseUrl: "https://aicsbitbucket.corp.alleninstitute.org"
}

def gitAuthor() {
    sh(returnStdout: true, script: 'git log -1 --format=%an').trim()
}

// Returns true if we should not run the lint, circular-dependencies, test, build
// It is true when the CI is triggered via a commit by jenkins or when triggered using extra parameters for
// releasing the app
def skipBuild(params) {
    return params.INCREMENT_VERSION || gitAuthor() == "jenkins"
}
