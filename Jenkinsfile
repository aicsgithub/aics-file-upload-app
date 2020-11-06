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
        pollSCM("H */4 * * 1-5")
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
        choice(name: "VERSION_TO_INCREMENT", choices: ["patch", "minor", "major"], description: "Which part of the npm version to increment.")
    }
    stages {
        stage ("initialize build") {
           when {
                expression { return !params.INCREMENT_VERSION && gitAuthor() != "jenkins" }
           }
            steps {
                this.notifyBB("INPROGRESS")
                echo "BUILDTYPE: " + ( params.INCREMENT_VERSION ? "Create Release" : "Build, Tag, and Create Snapshot1")
                echo "${BRANCH_NAME}"
                echo "increment version: ${env.INCREMENT_VERSION}"
                echo "gitauthor: " + "${gitAuthor()}"

                git url: "${env.GIT_URL}", branch: "${env.BRANCH_NAME}", credentialsId:"9b2bb39a-1b3e-40cd-b1fd-fee01ebef965"
            }
        }
        stage ("lint") {
            when {
                expression { return !params.INCREMENT_VERSION && gitAuthor() != "jenkins" }
            }
            steps {
                sh "./gradlew -i yarn lint"
            }
        }
        stage("circular-dependencies") {
            when {
                expression { return !params.INCREMENT_VERSION && gitAuthor() != "jenkins" }
            }
            steps {
                sh "./gradlew -i detectCircularDeps"
            }
        }
        stage ("test") {
            when {
                expression { return !params.INCREMENT_VERSION && gitAuthor() != "jenkins" }
            }
            steps {
                sh "./gradlew -i test"
            }
        }
        stage ("build") {
            when {
                expression { return !params.INCREMENT_VERSION && gitAuthor() != "jenkins" }
            }
            steps {
                sh "./gradlew -i compile"
            }
        }
        stage ("version - release") {
            when {
                expression {
                    return env.INCREMENT_VERSION == "true" && env.BRANCH_NAME == "master"  && gitAuthor() != "jenkins"
                }
            }
            steps {
                sh "git checkout ${BRANCH_NAME}"
                sh "./gradlew -i yarn_version_--${VERSION_TO_INCREMENT}"
                 sh "git push -u origin master && git push --tags"
            }
        }
        stage ("version - snapshot") {
            when {
                expression {
                    return env.INCREMENT_VERSION == "false" && gitAuthor() != "jenkins"
                }
            }
            steps {
                sh "./gradlew -i createSnapshot"
                sh "git push -u origin ${BRANCH_NAME} && git push --tags"
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
