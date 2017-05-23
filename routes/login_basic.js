'use strict';

/**
 * this is an action for the microservice
 */

// Modules loading
var statuses = require('statuses');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');

var Identity = null;

var UNAUTHORIZED = {
  status: 401,
  message: statuses[401]
};

exports = module.exports = function(config) {

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router:login:basic`);

  return function(req, res) {
    Identity = Identity || mongoose.model('Identity');

    debug('Login an identity by email and password');

    // simple data validations
    // 0. check if body exists
    if (!req || !req.body) {
      return res.status(400).json({
        message: 'Body is missing',
        status: 400
      });
    }
    // 1. check if the email,password couple exists
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({
        message: 'Email and password are required',
        status: 400
      });
    }

    Identity.findOne({ email: req.body.email })
      // .select('+__hashedPWD').select('+__salt')
      .exec(function(err, identity) {
        if (err) {
          return res.status(500).json({
            message: err,
            status: 500
          });
        }

        if (!identity) {
          return res.status(401).json(UNAUTHORIZED);
        }

        // password check
        identity.checkPassword(req.body.password, function(invalid) {
          if (invalid) {
            return res.status(401).json(UNAUTHORIZED);
          }

          identity.lastLoginAt = Date.now();

          identity.update({
            lastLoginAt: identity.lastLoginAt
          }, function(error) {
            if (error) {
              debug('Update error', error);
            }
          });

          /* JWT TOKEN CREATION */
          identity = identity.toObject();

          // be sure there's no sensitive data
          delete identity.__salt;
          delete identity.__hashedPWD;

          var token = jwt.sign({identity: identity}, config.JWT_SECRET, {
            expiresIn: config.JWT_DURATION
          });

          return res.status(200).json(token);
        });

      });
  };
};


