/*global module:false */

var log = require('./log');
var Cookie = require('tiny-cookie');

var COOKIE_NAME = 'cid';

/**
 * Auth constructor. Default token and secret are
 * set to null, and we check the for a client UUID
 * cookie.
 */

var Auth = function() {
  this.token = null;
  this.secret = null;

  this.cookiesEnabled = Cookie.enabled();

  if (this.cookiesEnabled) {
    this.cid = Cookie.get(COOKIE_NAME);

    log('found uuid value cid = ' + this.cid);

  } else {
    this.cid = null;

    log('no pre-existing uuid value found');
  }
};

/**
 * Persist client UUID as a cookie and save it for signed
 * requests.
 */

Auth.prototype.setClientUUID = function(cid) {
  this.cid = cid;

  Cookie.set(COOKIE_NAME, cid, { expires: 3650, path: '/' });
};

/**
 * Delete the persisted UUID cookie
 */

Auth.deleteClientUUID = function() {
  Cookie.remove(COOKIE_NAME);
};

module.exports = Auth;

