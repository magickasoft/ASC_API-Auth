/* eslint no-invalid-this:0 */

'use strict';

/**
 * This file loads a model from a Swagger definition
 */

// Modules loading
var path = require('path');
var RefParser = require('json-schema-ref-parser');

exports = module.exports = function(config) {
  // this is the swagger file
  var SWAGGER_FILE = path.join(__dirname, `../swagger/api/${config.SRV_NAME}.yaml`);

  // Log setup
  var debug = require('debug')(`${config.SRV_NAME}:model:${config.SRV_NAME}`);

  var collection = {};

  // loading schema definition from Swagger file
  var parser = new RefParser()
    .bundle(SWAGGER_FILE)
    .then(function(schema) {

      var crypto = require('crypto');
      var mongoose = require('mongoose');
      var Identity;

      var swaggerMongoose = require('swaggering-mongoose');

      // schemas and modules compilation
      var definitions = swaggerMongoose.getDefinitions(schema);
      var IdentityProperties = definitions.Identity.properties;

      // custom properties here
      // password is a virtual path (see below), so it needs to be removed from the collection
      delete IdentityProperties.password;

      var schemas = swaggerMongoose.getSchemas(definitions);
      var IdentitySchema = schemas.Identity;
      // additional hidden properties here
      IdentitySchema.add({
        // the hashed password
        __hashedPWD: {
          type: String,
          default: '',
          select: false
        }
      });
      IdentitySchema.add({
        // password salt
        __salt: {
          type: String,
          default: '',
          select: false
        }
      });
      IdentitySchema.add({
        // a validation token
        __token: {
          type: Number,
          default: 0,
          select: false
        }
      });

      // createdAt, updatedAt
      IdentitySchema.set('timestamps', true);

      /**
       * Additional Mongoose Validations
       */

      IdentitySchema.path('email').validate(function(value, done) {
        Identity = Identity || mongoose.model('Identity');
        // Check if it already exists
        Identity.count({
          email: value
        }, function(err, count) {
          if (err) {
            return done(err);
          }

          // If `count` is greater than zero, 'invalidate'
          return done(count === 0);
        });
      }, 'Email already exists');

      IdentitySchema.path('facebookID').validate(function(value, done) {
        Identity = Identity || mongoose.model('Identity');
        // Check if it already exists
        Identity.count({
          facebookID: value
        }, function(err, count) {
          if (err) {
            return done(err);
          }

          // If `count` is greater than zero, 'invalidate'
          return done(count === 0);
        });
      }, 'FacebookID already exists');

      /**
       * Mongoose Virtual Paths
       */

      IdentitySchema
        .virtual('password')
        .set(function(password) {
          this.__salt = this.__salt || crypto.randomBytes(32).toString('base64');
          this.__hashedPWD = this.encryptPassword(password);
        });

      /**
       * Documents Methods
       */
      IdentitySchema.methods = {
        /**
         * Encrypt password
         *
         * @param {String} password - the password
         * @returns {String}    - the encrypted password
         */
        encryptPassword: function(password) {
          if (password) {
            return crypto
              .createHmac('SHA224', this.__salt)
              .update(password)
              .digest('hex');
          }
        },

        /**
         * checkPassword - check if the passwords are the same
         *
         * @param {String} plainText - a plain test password
         * @param {Function} invalidCB - the callback. It receive a true argument if passwords doesn't match
         */
        checkPassword: function(plainText, invalidCB) {
          if (this._id && (!this.__hashedPWD || !this.__salt)) { // identity function was not selected
            Identity = Identity || mongoose.model('Identity');
            Identity.findById(this._id)
              .select('+__hashedPWD').select('+__salt')
              .exec(function(err, identity) {
                return invalidCB(!!err || identity.encryptPassword(plainText) !== identity.__hashedPWD);
              });
          } else {
            return invalidCB(this.encryptPassword(plainText) !== this.__hashedPWD);
          }
        },

        /**
         * changePassword - change the password
         *
         * @param {String} newPassword - a plain test new password
         * @param {Function} cb - the callback. It receive a true argument if passwords doesn't match
         */
        changePassword: function(newPassword, cb) {
          Identity = Identity || mongoose.model('Identity');
          var doc = this;
          var query = Identity.findById(doc.id)
            .select('+__hashedPWD').select('+__salt')
            .exec(function(err, identity) {
              if (err || !identity) {
                return cb(err || 'Unknown user');
              }
              identity.update({
                __hashedPWD: identity.encryptPassword(newPassword)
              }, cb);
            });
        }
      };

      var models = collection.model = swaggerMongoose.getModels(schemas);

    }).catch(function(error) {
      debug('Parser error:', error);
    });

  // promisify
  collection.then = parser.then.bind(parser);
  collection.catch = parser.catch.bind(parser);
  return collection;

};
