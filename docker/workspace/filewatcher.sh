#!/bin/bash

WATCHFILE='/var/www/laravel/storage/logs/laravel.log'

while [ 0 = 0 ]
do
	if [ ! -f ${WATCHFILE} ]
	then
		echo "No file to tail, waiting for ${WATCHFILE}"
		sleep 10
	else
		tail -f ${WATCHFILE}
	fi
done
