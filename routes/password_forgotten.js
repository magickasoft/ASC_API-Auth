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

var ACCEPTED = {
  status: 202,
  message: statuses[202]
};

exports = module.exports = function(config) {

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router:password:forgotten`);

  return function(req, res) {
    Identity = Identity || mongoose.model('Identity');

    debug('Create and send a token for a forgotten identity password');

    // simple data validations
    // 0. check if body exists
    if (!req || !req.body) {
      return res.status(400).json({
        message: 'Body is missing',
        status: 400
      });
    }
    // 1. check if the email exists
    if (!req.body.email ) {
      return res.status(400).json({
        message: 'Email address is required',
        status: 400
      });
    }

    Identity.findOne({
      email: req.body.email,
      status: 'ACTIVE'
    }).exec(function(err, identity) {
      if (err) {
        return res.status(500).json({
          message: err,
          status: 500
        });
      }

      if (identity) {
        // create a validation token
        var token = fourDigit();
        // set the token
        return identity.update({
          __token: token
        }, function(_err, doc) {
          if (_err) {
            debug('Token update error', _err);
            return res.status(500).json({
              message: _err,
              status: 500
            });
          }
          // create an internal identity for ms authentication
          var jwtoken = jwt.sign({
            identity: {
              email: `${config.SRV_NAME}@asc`,
              roles: ['internal_ms']
            }
          }, config.JWT_SECRET, {
            expiresIn: config.JWT_DURATION
          });
          // send an email
          return request({
            url: config.COMMS_MS_URL, // comms-ms
            qs: {}, // Query string data
            method: 'POST',
            json: {
              templateName: 'identity_password_forgotten',
              templateData: {
                identity: identity,
                token: token
              }
            },
            headers: {
              Authorization: `bearer ${jwtoken}`
            }
          }, function(error, response, body) {
            if (!err && response && response.statusCode === 202) { // all ok
              return res.status(202).json(ACCEPTED);
            }
            if (error) {
              debug('Identity confirmation error contacting comms service', error);
            } else {
              debug('Identity confirmation from comms service', response.statusCode, body);
            }
            return res.status(500).json({
              message: error || body,
              status: 500
            });
          });
        });
      } else {
        return res.status(401).json(UNAUTHORIZED);
      }
    });
  };
};


