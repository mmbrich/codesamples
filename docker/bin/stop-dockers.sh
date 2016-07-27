#!/bin/bash
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" 
source ${MY_DIR}/functions.sh

for i in $DOCKERS
do
	$DOCKER stop $(${DOCKER} ps|grep $i|awk '{print $1}')
done
