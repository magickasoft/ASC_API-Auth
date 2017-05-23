'use strict';

/**
 * this is an action for the microservice
 */

// Modules loading
var statuses = require('statuses');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var request = require('request');
var fourDigit = require('../lib/tools').fourDigit;

var Identity = null;

var UNAUTHORIZED = {
  status: 401,
  message: statuses[401]
};

exports = module.exports = function(config) {

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router:post`);

  return function(req, res) {
    Identity = Identity || mongoose.model('Identity');

    debug('Creating a new identity');

    // simple data validations
    // 0. check if body exists
    if (!req || !req.body) {
      return res.status(400).json({
        message: 'Body is missing',
        status: 400
      });
    }
    // 1. body should have either email or facebook auth token not blank
    if (!req.body.email && !req.body.facebookAccessToken) {
      return res.status(400).json({
        message: 'Email or Facebook Access Token are required',
        status: 400
      });
    }
    // 2. check if the email,password couple exists
    if (req.body.email && !req.body.password) {
      return res.status(400).json({
        message: 'Email and password are required',
        status: 400
      });
    }
    // 3. check if token and profile exist (profile from passport.authorize)
    if (req.body.facebookAccessToken && (!req.facebookProfile || !req.facebookProfile.id)) {
      return res.status(401).json(UNAUTHORIZED);
    }

    var arg = null;
    if (req.body.email) {
      arg = req.body;
      arg.status = 'PENDING';
      arg.__token = fourDigit();
    }
    if (req.body.facebookAccessToken) {
      arg = {
        facebookID: req.facebookProfile.id,
        status: 'ACTIVE'
      };
    }

    Identity.create(arg, function(err, identity) {
      if (err || !identity) {
        return res.status(500).json({
          message: err,
          status: 500
        });
      }
      var _identity = identity; // keep a reference to the mongoose object
      identity = identity.toObject();

      // be sure there's no sensitive data
      delete identity.__salt;
      delete identity.__hashedPWD;
      delete identity.__token;

      // if registered by email, send a confirmation
      if (req.body.email) {
        // create an internal identity for ms authentication
        var token = jwt.sign({
          identity: {
            email: `${config.SRV_NAME}@asc`,
            roles: ['internal_ms']
          }
        }, config.JWT_SECRET, {
          expiresIn: config.JWT_DURATION
        });
        // send a confirmation email here
        return request({
          url: config.COMMS_MS_URL, // comms-ms
          qs: {}, // Query string data
          method: 'POST',
          json: {
            templateName: 'identity_confirm',
            templateData: {
              identity: identity,
              token: _identity.__token
            }
          },
          headers: {
            Authorization: `bearer ${token}`
          }
        }, function(error, response, body) {
          if (error) {
            debug('Identity confirmation error contacting comms service', error);
            res.status(500).json({
              message: error,
              status: 500
            });
          } else if (response.statusCode === 202) { // all ok
            return res.status(201).location('./' + identity._id.toString()).json(identity);
          } else {
            debug('Identity confirmation from comms service', response.statusCode, body);
            res.status(500).json({
              message: body,
              status: 500
            });
          }
          // On error, the identity must be removed
          return _identity.remove(function(_err, _result) {
            if (_err) {
              debug('An error occurred while removing the identity', _identity._id.toString(), ':', _err);
            }
          });
        });
      }

      return res.status(201).location('./' + identity._id.toString()).json(identity);
    });

  };
};


