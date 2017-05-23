# This PowerShell script will build and run the image on a Windows OS based host
# Prerequisites are the following to be installed:
# https://docs.docker.com/docker-for-windows/
# http://gnuwin32.sourceforge.net/packages/gtar.htm and tar must be in PATH
# This script must be run from the root path of the repository i.e. .\container\setup.ps1

$SRV_NAME="api-auth"
docker stop $SRV_NAME
docker rm --force $SRV_NAME
docker rmi --force asc/$SRV_NAME

tar cvf asc.tar.gz -C ./ ./package.json ./auth/* ./config/* ./lib/* ./models/* ./routes/* ./server/* ./swagger/*

docker build -f .\container\Dockerfile -t asc/$SRV_NAME .

docker run -p 3100:3100 -d --name $SRV_NAME asc/$SRV_NAME