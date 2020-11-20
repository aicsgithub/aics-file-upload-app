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
        choice(name: "VERSION_TO_INCREMENT", choices: ["prerelease", "patch", "minor", "major"], description: "Which part of the npm version to increment. Select 'prerelease' to create a snapshot.")
    }
    stages {
        stage ("initialize build") {
            steps {
                this.notifyBB("INPROGRESS")
                echo "${BRANCH_NAME}"

                git url: "${env.GIT_URL}", branch: "${env.BRANCH_NAME}", credentialsId:"9b2bb39a-1b3e-40cd-b1fd-fee01ebef965"
            }
        }
        stage ("install dependencies and lint") {
            steps {
                sh "./gradlew -i yarn lint"
            }
        }
        stage ("detect circular dependencies") {
            steps {
                sh "./gradlew -i detectCircularDeps"
            }
        }
        stage ("test") {
            steps {
                sh "./gradlew -i test"
            }
        }
        stage ("compile") {
            steps {
                sh "./gradlew -i compile"
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
