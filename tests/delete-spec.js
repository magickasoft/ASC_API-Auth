/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity'
};

var route = require('../routes/delete')(config);

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');


// loading mocked data
var newIdentities = require('./data/data.json');

describe('identity-ms delete handler', function() {
  var createdIdentities;

  beforeEach(function(done) {
    mockgoose(mongoose).then(function() {
      mongoose.connect('mongodb://example.com/TestingDB', function(err) {
        // Load model
        require('../models/identities')(config).then(function() {
          // Create some data
          mongoose.model('Identity').create(newIdentities, function(err, results) {
            createdIdentities = results;
            done(err);
          });
        });
      });
    });
  });

  afterEach(function(done) {
    mockgoose.reset(function() {
      mongoose.disconnect(function() {
        mongoose.unmock(function() {
          delete mongoose.models.Identity;
          done();
        });
      });
    });
  });

  it('should remove an identity', function(done) {

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(util.isArray(identity)).toBe(false);
      expect(identity.status).toBe(204);

      // check the database
      mongoose.model('Identity').findById(args.params.id)
        .lean().exec(function(_err, dbResults) {
          expect(_err).toBeNull();
          expect(dbResults).toBeNull();

          // check if the other data are still there
          mongoose.model('Identity').find({_id: createdIdentities[1]._id.toString()})
            .lean().exec(function(__err, _dbResults) {
              expect(__err).toBeNull();
              expect(_dbResults.length).toEqual(1);
              done();
            });
        });
    });
  });

  it('should not remove a not owned identity', function(done) {

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      },
      filterOwner: {
        _id: createdIdentities[1]._id.toString()
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(util.isArray(identity)).toBe(false);
      expect(identity.status).toBe(204);

      // check the database
      mongoose.model('Identity').findById(args.params.id)
        .lean().exec(function(_err, dbResults) {
          expect(_err).toBeNull();
          expect(dbResults).toBeDefined();

          // check if the other data are still there
          mongoose.model('Identity').find({_id: createdIdentities[1]._id.toString()})
            .lean().exec(function(__err, _dbResults) {
              expect(__err).toBeNull();
              expect(_dbResults.length).toEqual(1);
              done();
            });
        });
    });
  });

});
