/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity'
};

var route = require('../routes/confirm')(config);

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');


// loading mocked data
var newIdentities = require('./data/data.json');

describe('identity-ms confirm handler', function() {
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

  it('should confirm an identity', function(done) {

    mongoose.model('Identity').findById(createdIdentities[4]._id.toString())
    .select('+__token').lean().exec(function(_err, createdIdentity) {
      var args = {
        query: {
          token: createdIdentity._id.toString() + createdIdentity.__token
        }
      };

      run(setup(args), route, function(err, req, res) {
        expect(err).toBeNull();
        expect(res.status).toHaveBeenCalledWith(202);
        expect(res.json).toHaveBeenCalled();

        // check the database
        mongoose.model('Identity').findById(createdIdentity._id.toString())
        .lean().exec(function(__err, identity) {
          expect(__err).toBeNull();
          expect(identity).toBeDefined();
          expect(identity.status).toBe('ACTIVE');
          done();
        });
      });
    });
  });

  it('should not confirm an identity with an invalid token', function(done) {

    mongoose.model('Identity').findById(createdIdentities[4]._id.toString())
    .select('+__token').lean().exec(function(_err, createdIdentity) {
      var args = {
        query: {
          token: createdIdentity._id.toString() + '1111'
        }
      };

      run(setup(args), route, function(err, req, res) {
        expect(err).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalled();

        // check the database
        mongoose.model('Identity').findById(createdIdentity._id.toString())
        .lean().exec(function(__err, identity) {
          expect(__err).toBeNull();
          expect(identity).toBeDefined();
          expect(identity.status).not.toBe('ACTIVE');
          done();
        });
      });
    });
  });

  it('should not confirm an already active identity', function(done) {

    mongoose.model('Identity').findById(createdIdentities[5]._id.toString())
    .select('+__token').lean().exec(function(_err, createdIdentity) {
      var args = {
        query: {
          token: createdIdentity._id.toString() + createdIdentity.__token
        }
      };

      run(setup(args), route, function(err, req, res) {
        expect(err).toBeNull();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalled();
        done();
      });
    });
  });
});
