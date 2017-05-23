'use strict';

/* Authorize the identity roles with the required scopes */

// this function must be bound to the specific Swagger SecurityDefinitions property

// required scopes: users, admins, owner
// roles: admins, users
// if owner we have to delegate the access validation to the final implementor. For that, we have to add a special property to the request: filterOwner.
// This is an object with the field name of the owner property and the value from the identity token, i.e.error
// { email : 'user@example.com'}
// this data should be retrieved from the model/api definition (securityDefinitions -> securityItem -> x-authorize-owner), i.e :
// { email : 'email'}

// Log setup
var debug = function() {};

try {
  debug = require('debug')('authorizer');
} catch ( ex ) {}

// Modules loading
var statuses = require('statuses');

var ACCESS_FORBIDDEN = {
  status: 403,
  message: statuses[403]
};

var UNAUTHORIZED = {
  status: 401,
  message: statuses[401]
};

exports = module.exports = function(config) {

  var filterOwner = this && this['x-authorize-owner'] || config.authorizeOwner || {
    _id: '_id' // default ownership: item's id is the owner's id
  };
  var filterOwnerKey = Object.keys(filterOwner)[0];
  var filterOwnerIdentityKey = filterOwner[filterOwnerKey];

  return function authorize(req, res, next) {
    req = req || {};
    req.requiredScopes = req.requiredScopes || ['owner'];
    var identity = req.identity;

    debug('Matching', req.requiredScopes, 'with', identity);

    var validated = false;
    if (identity) {
      var roles = (identity.roles || []).filter(function(role) { // here ownership is a status check to be delegated, not a role.
        return role !== 'owner';
      });

      // scope validation
      // required scope should match at least one identity roles
      if (req.requiredScopes && roles) {
        req.requiredScopes.forEach(function(scope) {
          if (roles.indexOf(scope) !== -1) {
            validated = true;
          }
        });
      }

      // identity roles are superset of ownership, if not already validated we must explicit look for it now
      if (!validated && req.requiredScopes.indexOf('owner') !== -1) {
        debug(`Checking ownership: { ${filterOwnerKey} : ${filterOwnerIdentityKey} }`);
        // prior to delegate the owner checks, we can look at some basic request conflicts like id, query and body
        if (!identity[filterOwnerIdentityKey]) {
          debug('Refuse empty identity value: looking for', filterOwnerIdentityKey, 'into', identity);
          return next(ACCESS_FORBIDDEN); // the resource id is different from the owner id
        }
        // id based ownership check: i.e. GET /user/10 by user with _id = 1 -> filterOwner : {_id : '_id' }
        if (req.params && req.params.id && filterOwnerKey === '_id' && req.params.id !== identity[filterOwnerIdentityKey]) {
          debug('Denied id ownership', req.params.id, 'with', identity[filterOwnerIdentityKey]);
          return next(ACCESS_FORBIDDEN); // the resource id is different from the owner id
        }
        // query filter conflict check: i.e. GET /user_secrets/?userId=10 by user with _id = 1 -> filterOwner : {userId : '_id' }
        if (req.query && req.query[filterOwnerKey] && req.query[filterOwnerKey] !== identity[filterOwnerIdentityKey]) {
          debug('Denied query ownership', req.query[filterOwnerKey], 'with', identity[filterOwnerIdentityKey]);
          return next(ACCESS_FORBIDDEN); // the query looks for data that belongs to others
        }
        // body ownership check: i.e. PUT /profiles/15 {userId:10} by user with _id = 1 -> filterOwner : {userId : '_id' }
        if (req.body && req.body[filterOwnerKey] && req.body[filterOwnerKey] !== identity[filterOwnerIdentityKey]) {
          debug('Denied body ownership', req.body[filterOwnerKey], 'with', identity[filterOwnerIdentityKey]);
          return next(ACCESS_FORBIDDEN); // body tries to set/update data that belongs to others
        }
        // owner access delegation
        req.filterOwner = {};
        req.filterOwner[filterOwnerKey] = identity[filterOwnerIdentityKey];
        debug('Delegating ownership filtering', req.filterOwner);
        return next();
      }
    }

    debug('Matching result', (!identity && UNAUTHORIZED) || ((!validated) ? ACCESS_FORBIDDEN : null));
    return next((!identity && UNAUTHORIZED) || ((!validated) ? ACCESS_FORBIDDEN : null));
  };
};
