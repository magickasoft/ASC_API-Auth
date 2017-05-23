'use strict';

/**
 * This file loads the microservice routes
 */

// Modules loading
var passport = require('passport');
var FacebookTokenStrategy = require('passport-facebook-token');

module.exports = function(config) {
  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:auth:facebook`);

  return {
    strategy: new FacebookTokenStrategy({
      clientID: config.FACEBOOK_APP_ID,
      clientSecret: config.FACEBOOK_APP_SECRET,
      accessTokenField: 'facebookAccessToken',
      refreshTokenField: '',
      profileFields: ['id', 'displayName', 'photos', 'email'],
    }, function(accessToken, refreshToken, profile, done) {
      done(null, profile);
    }),
    authenticate: function(req, res, next) {
      passport.authenticate('facebook-token', function(error, profile, info) {
        req.facebookProfile = profile;
        return next();
      })(req, res, next);
    }
  };
};

