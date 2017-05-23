/* eslint-env jasmine */

'use strict';

// loading dependencies
var run = require('./lib/express-unit').run;
var setup = require('./lib/express-unit-default-setup');

var authorizer = require('../auth/authorizer').call({}, {});

describe('identity-ms authorizer', function() {

  it('should authorize a legit scoped request', function(done) {

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: ['users', 'guests']
      },
      requiredScopes: ['users']
    };

    authorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeUndefined();
    });

    done();
  });

  it('should not authorize an unidentified request', function(done) {

    var req = {
      requiredScopes: ['users']
    };

    authorizer(req, null, function(unauthorized) {
      expect(unauthorized).toBeDefined();
      expect(unauthorized.status).toBe(401);
      expect(req.filterOwner).toBeUndefined();
    });

    done();
  });


  it('should forbid an out-of-scope request', function(done) {

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: ['guests']
      },
      requiredScopes: ['users']
    };

    authorizer(req, null, function(unauthorized) {
      expect(unauthorized).toBeDefined();
      expect(unauthorized.status).toBe(403);
      expect(req.filterOwner).toBeUndefined();
    });

    done();
  });

  it('should delegate and filter an out-of-scope owner request', function(done) {

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner']
    };

    authorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();

      // with no clue, the filter can only be the  ownership filter (default identity._id key and its value)
      expect(req.filterOwner._id).toEqual(req.identity._id);
    });

    done();
  });

  it('should forbid an owner request with an empty ownerhip value', function(done) {

    var req = {
      identity: {
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner']
    };

    authorizer(req, null, function(unauthorized) {
      expect(unauthorized).toBeDefined();
      expect(unauthorized.status).toBe(403);
      expect(req.filterOwner).toBeUndefined();
    });

    done();
  });

  it('should override the default ownership identity key', function(done) {

    var customAuthorizer = require('../auth/authorizer').call({}, {authorizeOwner: {_id: 'username' }});
    var req = {
      identity: {
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner']
    };

    customAuthorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner._id).toEqual(req.identity.username);
    });

    done();
  });

  it('should override the default ownership key', function(done) {

    var customAuthorizer = require('../auth/authorizer').call({}, {authorizeOwner: { username: '_id' }});
    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner']
    };

    customAuthorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner.username).toEqual(req.identity._id);
    });

    done();
  });

  it('should override the default ownership keys', function(done) {

    var customAuthorizer = require('../auth/authorizer').call({}, {authorizeOwner: { username: 'username' }});
    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner']
    };

    customAuthorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner.username).toEqual(req.identity.username);
    });

    done();
  });


  it('should authorize and delegate an owner request id parameter and _id ownership and same value ', function(done) {

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner'],
      params: {
        id: 1
      }
    };

    authorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner._id).toEqual(req.identity._id);
    });

    done();
  });

  it('should forbid an owner request id parameter and _id ownership and different values ', function(done) {
    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner'],
      params: {
        id: 2
      }
    };

    authorizer(req, null, function(unauthorized) {
      expect(unauthorized).toBeDefined();
      expect(unauthorized.status).toBe(403);
      expect(req.filterOwner).toBeUndefined();
    });

    done();
  });

  it('should authorize and delegate an owner request id parameter with an overridden ownership key and same value', function(done) {

    var customAuthorizer = require('../auth/authorizer').call({}, {authorizeOwner: { _id: 'username' }});

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner'],
      params: {
        id: 'user1'
      }
    };

    customAuthorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner._id).toEqual(req.identity.username);
    });

    done();
  });

  it('should forbid a query based request with a mismatched values', function(done) {

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner'],
      query: {
        id: 2
      }
    };

    authorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner._id).toEqual(req.identity._id);
    });

    done();
  });

  it('should forbid a body based request with a mismatched values', function(done) {

    var req = {
      identity: {
        _id: 1,
        username: 'user1',
        roles: [ 'users' ]
      },
      requiredScopes: ['admins', 'owner'],
      body: {
        id: 2
      }
    };

    authorizer(req, null, function(unauthorized) {
      expect(!!unauthorized).toBe(false);
      expect(req.filterOwner).toBeDefined();
      expect(req.filterOwner._id).toEqual(req.identity._id);
    });

    done();
  });

});




