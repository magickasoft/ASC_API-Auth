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
var route = require('../routes/post')(config);

describe('identity-ms post handler', function() {

  beforeEach(function(done) {
    request.cb = null; // reset injected request cb
    request.response = null; // reset injected request response
    mockgoose(mongoose).then(function() {
      mongoose.connect('mongodb://example.com/TestingDB', function(err) {
        require('../models/identities')(config).then(done).catch(done);
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

  it('should create a new identity', function(done) {

    var args = {
      body: newIdentities[0]
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      expect(res.location).toHaveBeenCalled();

      var identity = res.json.mostRecentCall.args[0];
      expect(identity.email).toEqual(newIdentities[0].email);
      expect(identity.roles.length).toEqual(1);
      expect(identity.roles[0]).toEqual('users');
      expect(identity.password).toBeUndefined();
      expect(identity.__hashedPWD).toBeUndefined();
      expect(identity.__salt).toBeUndefined();
      expect(identity.__token).toBeUndefined();
      done();
    });
  });

  it('should create multiple identities', function(done) {

    async.map(newIdentities, function(newIdentity, cb) {

      var args = {
        body: newIdentity,
        facebookProfile: (newIdentity.facebookID) ? {
          id: newIdentity.facebookID
        } : void 0
      };

      run(setup(args), route, function(err, req, res) {
        expect(err).toBeNull();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalled();
        expect(res.location).toHaveBeenCalled();

        var identity = res.json.mostRecentCall.args[0];
        if (newIdentity.email) {
          expect(identity.email).toBeDefined();
          expect(identity.email).toEqual(newIdentity.email);
        }
        if (newIdentity.facebookID) {
          expect(identity.facebookID).toBeDefined();
          expect(identity.facebookID).toEqual(newIdentity.facebookID);
        }
        cb(null, identity);
      });
    }, function(err, results) {
      expect(err).toBeNull();
      expect(results.length).toEqual(newIdentities.length);
      var identity = results[1];
      if (newIdentities[1].email) {
        expect(identity.email).toBeDefined();
        expect(identity.email).toEqual(newIdentities[1].email);
      }
      if (newIdentities[1].facebookID) {
        expect(identity.facebookID).toBeDefined();
        expect(identity.facebookID).toEqual(newIdentities[1].facebookID);
      }
      done(err);
    });
  });

  it('should not create the same identity twice by email', function(done) {
    var identityTwins = [{
      'email': 'user1@example.com',
      'password': 'AAAAAA'
    }, {
      'email': 'user1@example.com',
      'password': 'BBBBBB'
    }];

    async.mapSeries(identityTwins, function(newIdentity, cb) {
      var args = {
        body: newIdentity
      };

      run(setup(args), route, function(err, req, res) {
        var status = res.status.mostRecentCall.args[0];
        if (status === 500) { // this is an error
          return cb(res.json.mostRecentCall.args[0]);
        }
        return cb(null, res.json.mostRecentCall.args[0]);
      });
    }, function(err, results) {
      expect(err).toBeDefined();
      var identities = results.filter(function(res) {
        return res;
      });
      expect(identities.length).toEqual(1);

      // check the database
      mongoose.model('Identity').find({
        email: identityTwins[0].email
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(1);
        done();
      });

    });
  });

  it('should not create the same identity twice by facebook', function(done) {
    var identityTwins = [{
      'facebookID': '1234',
      'facebookAccessToken': 't1234'
    }, {
      'facebookID': '1234',
      'facebookAccessToken': 't1234'
    }];

    async.mapSeries(identityTwins, function(newIdentity, cb) {
      var args = {
        body: newIdentity,
        facebookProfile: (newIdentity.facebookID) ? {
          id: newIdentity.facebookID
        } : void 0
      };

      run(setup(args), route, function(err, req, res) {
        var status = res.status.mostRecentCall.args[0];
        if (status === 500) { // this is an error
          return cb(res.json.mostRecentCall.args[0]);
        }
        return cb(null, res.json.mostRecentCall.args[0]);
      });
    }, function(err, results) {
      expect(err).toBeDefined();
      var identities = results.filter(function(res) {
        return res;
      });
      expect(identities.length).toEqual(1);

      // check the database
      mongoose.model('Identity').find({
        email: identityTwins[0].email
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(1);
        done();
      });

    });
  });

  it('should not accept request with no data', function(done) {

    var args = {
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(res.location).not.toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });
    });
  });

  it('should not create a new identity with empty password', function(done) {

    var args = {
      body: {
        'email': 'user1@example.com',
        'password': ''
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(res.location).not.toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
        email: args.body.email
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });
    });
  });

  it('should not create a new identity with an empty facebookProfile', function(done) {

    var args = {
      body: {
        'facebookAccessToken': 't1234',
        'facebookID': '1234',
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      expect(res.location).not.toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
        facebookID: args.body.facebookID
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });
    });
  });

  it('should not create a new identity with an empty facebookAccessToken', function(done) {

    var args = {
      body: {
        'facebookAccessToken': ''
      },
      facebookProfile: {
        id: '1234'
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(res.location).not.toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
        facebookID: args.facebookProfile.id
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });
    });
  });

  it('should not accept request without an email', function(done) {

    var args = {
      body: {
        'email': '',
        'password': 'secret'
      }
    };

    run(setup(args), route, function(err, req, res) {
      expect(err).toBeNull();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(res.location).not.toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
        password: args.body.password
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });
    });
  });

  it('should value a confirmation token on new identity by email', function(done) {

    var args = {
      body: newIdentities[0]
    };
    run(setup(args), route, function(err, req, res) {
      // check the database
      mongoose.model('Identity').find({
        email: args.body.email
      }).select('+__token').lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(1);
        expect(dbResults[0]).toBeDefined();
        expect(dbResults[0].__token).toBeDefined();
        done();
      });
    });
  });

  it('should call the comms microservice on new identity', function(done) {

    var args = {
      body: newIdentities[0]
    };

    request.cb = jasmine.createSpy();

    run(setup(args), route, function(err, req, res) {
      expect(request.cb).toHaveBeenCalled();

      done();
    });
  });


  it('should not create an identity if an error occured while sending the confirmation email', function(done) {

    var args = {
      body: newIdentities[0]
    };

    request.cb = jasmine.createSpy();
    request.response = ['error'];

    run(setup(args), route, function(err, req, res) {
      expect(request.cb).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
        email: args.body.email
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });

    });
  });

  it('should not create an identity if an error occured on the comms microservice', function(done) {

    var args = {
      body: newIdentities[0]
    };

    request.cb = jasmine.createSpy();
    request.response = [null, {
      statusCode: 400
    }, ''];

    run(setup(args), route, function(err, req, res) {
      expect(request.cb).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();

      // check the database
      mongoose.model('Identity').find({
        email: args.body.email
      }).lean().exec(function(_err, dbResults) {
        expect(dbResults.length).toEqual(0);
        done();
      });

    });
  });

});
