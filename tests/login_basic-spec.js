/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity',
  JWT_SECRET: 'TEST-SECRET',
  JWT_DURATION: 10 * 1000 //seconds
};

var jwt = require('jsonwebtoken');

var route = require('../routes/login_basic')(config);

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');


// loading mocked data
var newIdentities = require('./data/data.json');

describe('identity-ms login_basic handler', function() {
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

  it('should login a user', function(done) {

    var args = {
      body: newIdentities[0]
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var token = res.json.mostRecentCall.args[0];
      expect(util.isArray(token)).toBe(false);

      // token verification
      jwt.verify(token, config.JWT_SECRET, function(error, payload) {
        var identity = payload.identity;
        expect(error).toBeNull();
        expect(createdIdentities[0]._id.toString()).toEqual(identity._id.toString());
      });

      done();
    });
  });

  it('should update the last login date', function(done) {

    var args = {
      body: newIdentities[0]
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      // token verification
      var token = res.json.mostRecentCall.args[0];
      jwt.verify(token, config.JWT_SECRET, function(error, payload) {
        var identity = payload.identity;
        // check the database
        mongoose.model('Identity').findById(identity._id.toString()).lean()
          .exec(function(_err, dbResults) {
            expect(dbResults).toBeDefined();
            expect(dbResults.lastLoginAt.toISOString()).toEqual(identity.lastLoginAt);
            expect(dbResults.lastLoginAt.toISOString()).not.toEqual(createdIdentities[0].lastLoginAt && createdIdentities[0].lastLoginAt.toISOString() || null);
            done();
          });
      });
    });
  });

  it('should not login an existing user with a wrong password', function(done) {

    var args = {
      body: {
        email: newIdentities[0].email,
        password: newIdentities[0].password + '_wrong'
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();

      var status = res.status.mostRecentCall.args[0];
      var error = res.json.mostRecentCall.args[0];
      expect(error).toBeDefined();
      expect(error.status).toEqual(status);
      done();
    });
  });

  it('should complain about empty password', function(done) {

    var args = {
      body: {
        email: newIdentities[0].email,
        password: ''
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      var status = res.status.mostRecentCall.args[0];
      var error = res.json.mostRecentCall.args[0];
      expect(error).toBeDefined();
      expect(error.status).toEqual(status);
      done();
    });
  });
});
