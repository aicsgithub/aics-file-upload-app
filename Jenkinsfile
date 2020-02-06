pipeline {
    options {
        disableConcurrentBuilds()
        timeout(time: 1, unit: 'HOURS')
    }
    agent {
        node {
            label "electron"
        }
    }
    environment {
        PATH = "/home/jenkins/.local/bin:$PATH"
        REQUESTS_CA_BUNDLE = "/etc/ssl/certs"
        JAVA_HOME = "/usr/lib/jvm/jdk-10.0.2"
        VENV_BIN = "/local1/virtualenvs/jenkinstools/bin"
        PYTHON = "${VENV_BIN}/python3"
    }
    parameters {
        choice(name: "VERSION_TO_INCREMENT", choices: ["patch", "minor", "major"], description: "Which part of the npm version to increment. This is only used when PUBLISH is set to true.")
    }
    stages {
        stage ("initialize build") {
            steps {
                this.notifyBB("INPROGRESS")
                echo "BUILDTYPE: " + ( params.PROMOTE_ARTIFACT ? "Promote Image" : "Build, Publish and Tag")
                echo "${BRANCH_NAME}"
                git url: "${env.GIT_URL}", branch: "${env.BRANCH_NAME}", credentialsId:"9b2bb39a-1b3e-40cd-b1fd-fee01ebef965"
            }
        }
        stage ("lint") {
            when {
                expression {
                    return env.VERSION_TO_INCREMENT == null
                }
            }
            steps {
                sh "./gradlew -i yarn lint"
            }
        }
        stage ("test") {
            when {
                expression {
                   return env.VERSION_TO_INCREMENT == null
                }
            }
            steps {
                sh "./gradlew -i test"
            }
        }
        stage ("build") {
            when {
                expression {
                   return env.VERSION_TO_INCREMENT == null
                }
            }
            steps {
                sh "./gradlew -i compile"
            }
        }
        stage ("version") {
            when {
                expression {
                    return env.VERSION_TO_INCREMENT != null
                }
            }
            steps {
                sh "./gradlew -i yarn_version_--${VERSION_TO_INCREMENT}"
            }
        }
    }
    post {
        always {
            this.notifyBB(currentBuild.result)
        }
        cleanup {
            sh './gradlew -i  artifactClean'
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
            credentialsId: 'aea50792-dda8-40e4-a683-79e8c83e72a6',
            disableInprogressNotification: false,
            considerUnstableAsSuccess: true,
            ignoreUnverifiedSSLPeer: false,
            includeBuildNumberInKey: false,
            prependParentProjectKey: false,
            projectKey: 'SW',
            stashServerBaseUrl: 'https://aicsbitbucket.corp.alleninstitute.org'
}
