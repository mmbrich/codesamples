#!/bin/bash -i
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source ${MY_DIR}/functions.sh

cd ${DOCKER_DIR}
${COMPOSER} up -d ${DOCKERS}
cd ${WORK_DIR}
