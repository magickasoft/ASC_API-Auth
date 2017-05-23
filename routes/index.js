'use strict';

/**
 * This file loads the microservice routes
 */

// Modules loading
var path = require('path');
var RefParser = require('json-schema-ref-parser');
var passport = require('passport');

exports = module.exports = function(config) {
  // this is the swagger file
  var SWAGGER_FILE = path.join(__dirname, `../swagger/api/${config.SRV_NAME}.yaml`);

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:router`);

  // Authentication & Authorization setup
  var jwt = require('../auth/bearer_jwt')(config);
  passport.use(jwt.strategy);

  // Facebook token based authentication
  var facebook = require('../auth/facebook')(config);
  passport.use(facebook.strategy);

  // router creation
  var router = require('express')();

  // enable CORS for all request
  router.use(require('cors')());

  // Body parser
  router.use(require('body-parser').json({
    limit: '10mb'
  }));

  router.use(passport.initialize());

  // jwt authentication everywhere
  router.all('*', jwt.authenticate);

  // loading paths definition from Swagger file
  var parser = new RefParser()
    .dereference(SWAGGER_FILE)
    .then(function(schema) {
      var swaggerize = require('swaggerize-express');

      schema.securityDefinitions.jwt['x-authorize'] = require('../auth/authorizer').call(schema.securityDefinitions.jwt, config);

      router.use(swaggerize({
        api: schema,
        docspath: `/apidocs/${config.SRV_NAME}`,
        handlers: {
          'identities': {
            $get: require('./get')(config),
            $post: [
              facebook.authenticate,
              require('./post')(config)
            ],
            login: {
              basic: {
                $post: require('./login_basic')(config)
              },
              facebook: {
                $post: [
                  facebook.authenticate,
                  require('./login_facebook')(config)
                ]
              },
            },
            password: {
              change: {
                $post: require('./password_change')(config)
              },
              forgotten: {
                $post: require('./password_forgotten')(config)
              },
              reset: {
                $post: require('./password_reset')(config)
              }
            },
            confirm: {
              $get: require('./confirm')(config)
            },
            '{id}': {
              $get: require('./get')(config),
              $put: require('./put')(config),
              $delete: require('./delete')(config)
            }
          }
        }
      }));

    }).catch(function(error) {
      debug('Parser error:', error, error.stack || '');
    });

  return router;
};
