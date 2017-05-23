/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity'
};

var route = require('../routes/put')(config);

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');


// loading mocked data
var newIdentities = require('./data/data.json');

describe('identity-ms put handler', function() {
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

  it('should update an identity', function(done) {

    var update = {
      email: 'newemail@newaddress.com'
    };

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      },
      body: update
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(identity.email).toEqual(update.email);
      expect(identity._id.toString()).toEqual(createdIdentities[0]._id.toString());

      done();
    });
  });

  it('should not update a not owned identity', function(done) {

    var update = {
      email: 'newemail@newaddress.com'
    };

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      },
      body: update,
      filterOwner: {
        _id: createdIdentities[1]._id.toString()
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(util.isArray(identity)).toBe(false);
      expect(identity.status).toBe(400);

      // check the database
      mongoose.model('Identity').findById(args.params.id)
        .lean().exec(function(_err, dbResult) {
          expect(_err).toBeNull();
          expect(dbResult).toBeDefined();
          expect(dbResult.email).toEqual(createdIdentities[0].email);
          expect(dbResult._id.toString()).toEqual(createdIdentities[0]._id.toString());

          mongoose.model('Identity').findById(createdIdentities[1]._id.toString())
          .lean().exec(function(_err, _dbResult) {
            expect(_err).toBeNull();
            expect(_dbResult).toBeDefined();
            expect(_dbResult.email).toEqual(createdIdentities[1].email);
            expect(_dbResult._id.toString()).toEqual(createdIdentities[1]._id.toString());

            done();
          });
        });
    });
  });

  it('should not update an identity email if it already exists', function(done) {

    var update = {
      email: createdIdentities[1].email
    };

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      },
      body: update
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();

      var error = res.json.mostRecentCall.args[0];
      expect(error.status).toEqual(500);
      expect(error.message).toBeDefined();

      done();
    });
  });
});
