'use strict';

/*
  this file explicits the default for configuration variables
 */

var config = {

  // APP_PORT: process.env.APP_PORT || 3100,
    APP_PORT: process.env.APP_PORT || 3000,
  APP_HOST: process.env.APP_HOST || '0.0.0.0',
  SRV_NAME: process.env.SRV_NAME || 'identity',
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_HOST: process.env.MONGODB_HOST || 'localhost',
  JWT_SECRET: process.env.JWT_SECRET || 'ASC-SECRET',
  JWT_DURATION: (process.env.JWT_DURATION || 10 * 24 * 60 * 60) * 1000, // seconds
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || ' ',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || ' ',
  // COMMS_MS_URL: process.env.COMMS_MS_URL || 'http://api-comms:3900/v1/email',
  //  COMMS_MS_URL: process.env.COMMS_MS_URL || 'http://0.0.0.0:3900/v1/email',
    COMMS_MS_URL: process.env.COMMS_MS_URL || 'http://127.0.0.1:3900/v1/email',
};


config.MONGODB_NAME = process.env.MONGODB_NAME || config.SRV_NAME;

if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') { // development and test specific
  config.DEBUG = process.env.DEBUG = '*'; // forcing debug output
}

exports = module.exports = config;
