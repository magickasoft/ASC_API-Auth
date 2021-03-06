/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity'
};

var route = require('../routes/password_change')(config);

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');


// loading mocked data
var newIdentities = require('./data/data.json');

describe('identity-ms password_change handler', function() {
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

  it('should change an identity password', function(done) {

    var update = {
      email: newIdentities[0].email,
      oldPassword: newIdentities[0].password,
      newPassword: 'newPassword'
    };

    var args = {
      body: update
    };
    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').findById(createdIdentities[0]._id.toString())
        .exec(function(_err, dbResult) {
          expect(_err).toBeNull();
          expect(dbResult).toBeDefined();
          expect(dbResult.checkPassword).toBeDefined();
          dbResult.checkPassword(update.oldPassword, function(invalid) {
            expect(!!invalid).toBe(true);
            dbResult.checkPassword(update.newPassword, function(_invalid) {
              expect(!!_invalid).toBe(false);
              done();
            });
          });
        });


    });
  });

  it('should not change a password with not valid old password', function(done) {

    var update = {
      email: newIdentities[0].email,
      oldPassword: newIdentities[0].password + '_wrong',
      newPassword: 'newPassword'
    };

    var args = {
      body: update
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(401);

      // check the database
      mongoose.model('Identity').findById(createdIdentities[0]._id.toString())
        .exec(function(_err, dbResult) {
          expect(_err).toBeNull();
          expect(dbResult).toBeDefined();
          expect(dbResult.checkPassword).toBeDefined();
          dbResult.checkPassword(newIdentities[0].password, function(invalid) {
            expect(!!invalid).toBe(false);
            dbResult.checkPassword(update.newPassword, function(_invalid) {
              expect(!!_invalid).toBe(true);
              done();
            });
          });
        });


    });
  });

  it('should complain about empty or missing fields', function(done) {

    var args = {
      body: {
        email: newIdentities[0].email,
        oldPassword: ''
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      var error = res.json.mostRecentCall.args[0];
      expect(error).toBeDefined();
      expect(error.status).toEqual(400);
      done();
    });
  });
});
