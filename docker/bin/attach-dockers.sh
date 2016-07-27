#!/bin/bash -i
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" 
source ${MY_DIR}/functions.sh


tail -f ${PROJECT_DIR}/storage/logs/laravel.log &
tail_pid=$!

cd ${DOCKER_DIR}
# don't attach to workspace, tail the log instead
$COMPOSER up -d workspace
$COMPOSER up -d nodesignals
$COMPOSER up $ATTACH_DOCKERS

# clean up workspace and our log tail
echo "Stopping docker_workspace"
kill -9 ${tail_pid}
${DOCKER} stop $(${DOCKER} ps|grep workspace|awk '{print $1}')

cd ${WORK_DIR}
