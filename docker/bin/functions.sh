DOCKERS='application data mysql nginx nodesignals php-fpm redis workspace'
ATTACH_DOCKERS='application data mysql nginx php-fpm redis'

COMPOSE=`which docker-compose`
DOCK=`which docker`
DOCKER="sudo $DOCK"
COMPOSER="sudo $COMPOSE"

WORK_DIR=`pwd`
BIN_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DOCKER_DIR="${BIN_DIR}/../"
PROJECT_DIR="${BIN_DIR}/../../"

function aptGulp() {

	if [[ -z "$1" ]]
	then
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic 'gulp'
	else
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic "gulp ${1}"
	fi
}

function aptComposer() {
	if [[ -z "$1" ]]
	then
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic 'composer.phar'
	else
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic "composer.phar ${1} ${2} ${3}"
	fi
}

function aptNpm() {
	if [[ -z "$1" ]]
	then
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic 'npm'
	else
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic "npm ${1} ${2} ${3}"
	fi
}

function aptBower() {
	if [[ -z "$1" ]]
	then
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic 'bower'
	else
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic "bower ${1} ${2} ${3}"
	fi
}

function aptArtisan() {
	if [[ -z "$1" ]]
	then
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic 'php artisan'
	else
		${DOCKER} exec -it $(${DOCKER} ps|grep workspace|awk '{print $1}') bash -ic "php artisan ${1} ${2} ${3}"
	fi
}
