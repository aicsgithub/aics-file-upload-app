#!/usr/bin/env bash

#!/bin/bash -e

[[ ${DEBUG} == true ]] && set -x

####################################################################
# Other Settings
####################################################################

# Files created by the service should be group writeable
export UMASK=0002

####################################################################
# Main startup
####################################################################

if [[ "$1" == "bash" ]];
then
    exec "$@"
else
    # Get the user and group names we're (possibly) modifying, and the set of directories that need to be chowned
    source entrypoint-params

    if [[ -n "$SERVICE_UID" ]];
    then
        # If a SERVICE_UID is given but not a SERVICE_GID, then set the GID based on the UID.
        : ${SERVICE_GID:=$SERVICE_UID}

        OLD_UID=$(getent passwd $SERVICE_USER_NAME | cut -d : -f 3)
        OLD_GID=$(getent group $SERVICE_GROUP_NAME | cut -d : -f 3)
        if [[ $OLD_GID != $SERVICE_GID ]]; then
            # groupmod will also update the passwd file as needed to preserve login group associations
            /usr/sbin/groupmod -g $SERVICE_GID $SERVICE_GROUP_NAME
            chown -R --from :$OLD_GID :$SERVICE_GID "${OWNED_DIRECTORIES[@]}"
        fi
        if [[ $OLD_UID != $SERVICE_UID ]]; then
            /usr/sbin/usermod -u $SERVICE_UID $SERVICE_USER_NAME
            chown -R --from $OLD_UID $SERVICE_UID "${OWNED_DIRECTORIES[@]}"
        fi
    fi

    # Now execute
    exec "$@"
fi
