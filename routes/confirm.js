'use strict';

/**
 * this is an action for the microservice
 */

// Modules loading
var statuses = require('statuses');
var mongoose = require('mongoose');

var Identity = null;

var INVALID_REQUEST = {
  status: 400,
  message: statuses[400]
};

var ACCEPTED = {
  status: 202,
  message: statuses[202]
};

exports = module.exports = function(config) {

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router:confirm`);

  return function(req, res) {
    Identity = Identity || mongoose.model('Identity');

    debug(`Confirming an identity with token ${req.query.token}`);

    // simple data validations
    // 0. check if query exists
    if (!req || !req.query) {
      return res.status(400).json({
        message: 'Query parameters are missing',
        status: 400
      });
    }
    // 1. query should have a token
    if (!req.query.token) {
      return res.status(400).json({
        message: 'Token is required',
        status: 400
      });
    }

    var tokenMatching = /([0-9a-z]{24})([0-9]{4})/g;
    var match = tokenMatching.exec(req.query.token);

    if (!match) {
      return res.status(400).json({
        message: 'Invalid token',
        status: 400
      });
    }

    var id = match[1];
    var token = match[2];

    req.filterOwner = req.filterOwner || {};
    req.filterOwner.$and = [{
      _id: id,
      status: 'PENDING',
      __token: token
    }];
    // be sure update will eventually trigger middleware hooks
    Identity.findOne(req.filterOwner).exec(function(err, doc) {
      if (err) {
        return res.status(500).json({
          message: err,
          status: 500
        });
      }
      if (!doc) {
        return res.status(400).json(INVALID_REQUEST);
      }
      doc.update({
        status: 'ACTIVE',
        __token: 0
      }, function(_err, customer) {
        if (_err) {
          return res.status(500).json({
            message: _err,
            status: 500
          });
        }
        res.status(202).json(ACCEPTED);
      });
    });

  };
};


