#!/bin/bash -i

MY_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source ${MY_DIR}/functions.sh 

# get latet code

# clean up
cd ${PROJECT_DIR}
if [ -f "storage/logs/laravel.log" ]
then
	sudo rm ${PROJECT_DIR}/storage/logs/laravel.log
fi

if [ ! -d "public/tempUploadFiles" ]
then
	mkdir ${PROJECT_DIR}/public/tempUploadFiles
fi

# back to work
cd ${DOCKER_DIR}
$COMPOSER build $DOCKERS

# bring 'em up, build DB, run commands
echo "Dockers built, running and configuring"
$COMPOSER up -d $DOCKERS

echo "Setting up ENV file"
cd ${PROJECT_DIR}
if [ ! -f ".env" ]
then
	cp .env.docker .env
fi

cd ${DOCKER_DIR}
shopt -s expand_aliases
source ./aliases.bash

echo "Composer install"
apt-composer install --no-scripts
apt-composer update

echo "Bower install"
apt-bower install --allow-root

echo "NPM install"
apt-npm install

echo "Running GULP"
apt-gulp

echo "Migrating Database"
apt-artisan migrate

echo "Building final Node Signals Server"
$COMPOSER build nodesignals
$COMPOSER up -d nodesignals
