/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity'
};

var route = require('../routes/get')(config);

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');


// loading mocked data
var newIdentities = require('./data/data.json');

describe('identity-ms get handler', function() {
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
        })
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

  it('should get all identities', function(done) {

    var args = {
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identities = res.json.mostRecentCall.args[0];
      expect(util.isArray(identities)).toBe(true);
      expect(createdIdentities.length).toBe(identities.length);

      done();
    });
  });

  it('should get one identity', function(done) {

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(util.isArray(identity)).toBe(false);
      expect(createdIdentities[0]._id.toString()).toEqual(identity._id.toString());

      done();
    });
  });

  it('should select one identity', function(done) {

    var args = {
      query: {
        'email': createdIdentities[0].email
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identities = res.json.mostRecentCall.args[0];
      expect(util.isArray(identities)).toBe(true);
      expect(identities.length).toBe(1);
      expect(createdIdentities[0]._id.toString()).toEqual(identities[0]._id.toString());

      done();
    });
  });

  it('should not select any identities', function(done) {

    var args = {
      query: {
        'email': 'notuser@example.com'
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identities = res.json.mostRecentCall.args[0];
      expect(util.isArray(identities)).toBe(true);
      expect(identities.length).toBe(0);

      done();
    });
  });

  it('should return only own identity when querying for all', function(done) {

    var args = {
      filterOwner: {
        'email': createdIdentities[0].email
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identities = res.json.mostRecentCall.args[0];
      expect(util.isArray(identities)).toBe(true);
      expect(identities.length).toBe(1);
      expect(createdIdentities[0]._id.toString()).toEqual(identities[0]._id.toString());

      done();
    });
  });

  it('should not select any identities when querying for not owned identity', function(done) {

    var args = {
      filterOwner: {
        'email': createdIdentities[0].email
      },
      query: {
        'email': createdIdentities[1].email
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identities = res.json.mostRecentCall.args[0];
      expect(util.isArray(identities)).toBe(true);
      expect(identities.length).toBe(0);

      done();
    });
  });

  it('should not select any identities when getting a not owned identity', function(done) {

    var args = {
      filterOwner: {
        'email': createdIdentities[0].email
      },
      params: {
        'id': createdIdentities[1]._id
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(util.isArray(identity)).toBe(false);
      expect(identity).toBeNull();

      done();
    });
  });

  it('should not access sensitive data', function(done) {

    var args = {
      params: {
        id: createdIdentities[0]._id.toString()
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(util.isArray(identity)).toBe(false);
      expect(createdIdentities[0]._id.toString()).toEqual(identity._id.toString());
      expect(identity.password).toBeUndefined();
      expect(identity.__hashedPWD).toBeUndefined();
      expect(identity.__salt).toBeUndefined();

      done();
    });
  });
});
