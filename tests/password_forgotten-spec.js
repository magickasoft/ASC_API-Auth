/* eslint-env jasmine */

'use strict';

var config = {
  SRV_NAME: 'identity',
  JWT_SECRET: 'TEST-SECRET',
  JWT_DURATION: 10 * 1000 //seconds
};

// loading dependencies
var mongoose = require('mongoose');
// mongoose.set('debug', true);
var mockgoose = require('mockgoose');
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');
var util = require('util');
var async = require('async');
var jasmine = require('jasmine-node');
var mockrequire = require('mock-require');

// loading mocked data
var newIdentities = require('./data/data.json');

// mock target dependencies
var request = function(options, callback) {
  // test can inject a cb to access the parameters
  if (request.cb) {
    request.cb.apply(null, arguments);
  }

  // injected response or default
  request.response = request.response || [ null, {
    statusCode: 202
  }, ''];

  // default action: calltrough the callback with the injected response
  return callback.apply(null, request.response);
};

mockrequire('request', request);

// loading the target route
var route = require('../routes/password_forgotten')(config);

describe('identity-ms password_forgotten handler', function() {
  var createdIdentities;

  beforeEach(function(done) {
    request.cb = null; // reset injected request cb
    request.response = null; // reset injected request response
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

  it('should set a validation token', function(done) {
    var args = {
      body: {
        email: createdIdentities[5].email
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').findById(createdIdentities[5]._id.toString())
      .select('+__token').lean().exec(function(__err, identity) {
        expect(__err).toBeNull();
        expect(identity).toBeDefined();
        expect(identity.__token).toBeDefined();
        expect(identity.__token).not.toEqual(0);
        expect(identity.__token).not.toEqual(createdIdentities[5].__token);
        done();
      });
    });
  });

  it('should unauthorize a request for an invalid email', function(done) {
    var args = {
      body: {
        email: createdIdentities[5].email + 'wrong'
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();

      done();
    });
  });

  it('should return error on a request with no email', function(done) {
    var args = {
      body: {
        email: ''
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();

      done();
    });
  });

  it('should call the comms microservice for a new email', function(done) {
    var args = {
      body: {
        email: createdIdentities[5].email
      }
    };

    request.cb = jasmine.createSpy();

    run(setup(args), route, function(err, req, res) {
      expect(request.cb).toHaveBeenCalled();
      done();
    });
  });

  it('should return error if comms email is not sent', function(done) {
    var args = {
      body: {
        email: createdIdentities[5].email
      }
    };

    request.cb = jasmine.createSpy();
    request.response = [null, {
      statusCode: 400
    }, ''];

    run(setup(args), route, function(err, req, res) {
      expect(request.cb).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();

      done();
    });
  });
});
