#!/bin/bash
SRV_NAME="asc-ms-identity"
docker stop $SRV_NAME
docker rm --force $SRV_NAME
docker rmi --force asc/$SRV_NAME

tar cvzf asc.tar.gz -C ./  ../package.json ../[a-z]*/ --exclude='node_modules' --exclude='container'

docker build -t asc/$SRV_NAME .

rm -rf asc.tar.gz

./run.sh