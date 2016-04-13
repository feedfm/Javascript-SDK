/*global module:false */

/**
 * The Auth class holds 'token' and 'secret'
 * values
 */

var Auth = function(token, secret) {
  this.token = token;
  this.secret = secret;
};

module.exports = Auth;

