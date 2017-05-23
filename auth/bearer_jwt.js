'use strict';

/**
 * This file loads the microservice routes
 */

// Modules loading
var passport = require('passport');
var jwt = require('jsonwebtoken');
var BearerStrategy = require('passport-http-bearer').Strategy;

module.exports = function(config) {
  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router`);

  return {
    strategy: new BearerStrategy(function(token, cb) {
      jwt.verify(token, config.JWT_SECRET, cb);
    }),
    authenticate: function(req, res, next) {
      passport.authenticate('bearer', function(err, payload, info) {
        req.identity = payload && payload.identity;
        return next(err);
      })(req, res, next);
    }
  };
};
