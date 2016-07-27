#!/bin/bash
MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" 
source ${MY_DIR}/functions.sh


echo "WARNING!! THIS WILL DELETE ALL CONTAINERS AND IMAGES IN YOUR PROJECT!"
echo "You can re-create them at any time"
echo "Hit Cntl-C to exit now if you wish to stop"
sleep 5


echo "Stopping project dockers"
for i in $DOCKERS
do
	$DOCKER stop $(${DOCKER} ps|grep $i|awk '{print $1}')
done

echo "Stopping all dockers"
$DOCKER stop $(${DOCKER} ps -a|awk '{print $1}')

echo "DELTING DOCKER CONTAINERS!!"
$DOCKER rm $(${DOCKER} ps -a|awk '{print $1}')

echo "DELTING DOCKER IMAGES!!"
$DOCKER rmi $(${DOCKER} images|awk '{print $1}')
