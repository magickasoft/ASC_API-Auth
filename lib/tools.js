'use strict';

/**
 * Just a collection of simple and useful functions
 */

// it does nothing
exports.noop = function() {};

// object mixin
exports.extend = function(destination, source) {
  for (var k in source) {
    if (source.hasOwnProperty(k)) {
      destination[k] = source[k];
    }
  }
  return destination;
};

// lowercase
exports.toLower = function(v) {
  return v.toLowerCase();
};

// Check for a valid BSON id
exports.isValidBSONId = function(id) {
  var regID = /[0-9a-z]{24}$/;
  return id && regID.test(id);
};

// generate 4 digit number randomly, no zero leading
exports.fourDigit = function() {
  return Math.floor(Math.random() * 8999 + 1000);
}
