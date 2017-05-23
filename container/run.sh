#!/bin/bash
SRV_NAME="asc-ms-identity"
docker stop $SRV_NAME
docker rm $SRV_NAME
docker run -d --name $SRV_NAME --link mongodb:mongodb --link comms:comms asc/$SRV_NAME
