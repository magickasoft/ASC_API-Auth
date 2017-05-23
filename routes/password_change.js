'use strict';

/**
 * this is an action for the microservice
 */

// Modules loading
var statuses = require('statuses');
var mongoose = require('mongoose');

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
  var debug = require('debug')(`${config.SRV_NAME}:router:password:change`);

  return function(req, res) {
    Identity = Identity || mongoose.model('Identity');

    debug('Change an identity password');

    // simple data validations
    // 0. check if body exists
    if (!req || !req.body) {
      return res.status(400).json({
        message: 'Body is missing',
        status: 400
      });
    }
    // 1. check if the email,password couple exists
    if (!req.body.email || !req.body.oldPassword || !req.body.newPassword) {
      return res.status(400).json({
        message: 'Email and new/old passwords are required',
        status: 400
      });
    }

    Identity.findOne({
      email: req.body.email
    })
      // .select('+__hashedPWD').select('+__salt')
      .exec(function(err, identity) {
        if (err) {
          return res.status(500).json({
            message: err,
            status: 500
          });
        }

        if (identity) {
          identity.checkPassword(req.body.oldPassword, function(invalid) {
            if (invalid) {
              return res.status(401).json(UNAUTHORIZED);
            }

            identity.changePassword(req.body.newPassword, function(error) {
              if (error) {
                return res.status(500).json({
                  status: 500,
                  message: error
                });
              }
              return res.status(202).json(ACCEPTED);
            });
          });
        } else {
          return res.status(401).json(UNAUTHORIZED);
        }
      });
  };
};


