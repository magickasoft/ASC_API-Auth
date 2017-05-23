#!/bin/bash
#zip up the API files to put into docker image.

#These are options to work for tar on MacOSx
#Could not get the --exclude to work even with updating to gnu-tar 1.29
#/usr/local/bin/tar cvzf asc.tar.gz -C ./  ../package.json ../[a-z]*/ --exclude='node_modules' --exclude='container' --exclude='tests'
#This works, but is without --exclude
#/usr/local/bin/tar cvzf asc.tar.gz -C ./ ./package.json ./auth/* ./config/* ./lib/* ./models/* ./routes/* ./server/* ./swagger/*

#This works as-is for Ubuntu's tar
tar cvzf ../asc.tar.gz -C ./  ../package.json ../[a-z]*/ --exclude='node_modules' --exclude='container' --exclude='tests'