'use strict';

/**
 * this is a microservice action
 */

var mongoose = require('mongoose');

var Identity = null;

exports = module.exports = function(config) {

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router:get`);

  return function(req, res) {
    Identity = Identity || mongoose.model('Identity');

    req.params = req.params || {};
    debug((req.params.id) ? `Get an identity by ID ${req.params.id}` : req.query && `Query identities by ${require('util').inspect(req.query)}` || '');

    var query;
    if (req.filterOwner) { // owner based filtering
      debug('Filtering by', req.filterOwner);
      req.filterOwner.$and = [(req.params.id) ? { _id: req.params.id } : req.query ];
      query = (req.params.id) ? Identity.findOne(req.filterOwner) : Identity.find(req.filterOwner);
    } else {
      query = (req.params.id) ? Identity.findById(req.params.id) : Identity.find(req.query);
    }

    query.lean().exec(function(err, result) {
      if (err) {
        res.status(500).json({
          message: err,
          status: 500
        });
      } else {
        res.status(200).json(result);
      }
    });
  };
};
