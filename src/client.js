/*global module:false */

var log = require('./log');
var Cookie = require('tiny-cookie');

var COOKIE_NAME = 'cid';

var localCid = '';

/**
 * The Client class keeps track of a client's
 * UUID value.
 *
 * @classdesc
 * @class
 */

var Client = function() {

};

Client._cookiesEnabled = Cookie.enabled();

/**
 * Returns true if the client will let us set cookies.
 *
 * @return {boolean} true if cookies are available
 */

Client.cookiesEnabled = function() {
  return Client._cookiesEnabled;
};

/**
 * Persist UUID 
 */

Client.setClientUUID = function(cid) {
  if (Client.cookiesEnabled()) {
    log('cookies are enabled, so setting cookie "' + COOKIE_NAME + '"="' + cid + '"');

    Cookie.set(COOKIE_NAME, cid, { expires: 3650, path: '/' });

  } else {
    log('cookies are not enabled, so saving cid to global value ="' + cid + '"');

    localCid = cid;
  }
};

/*
 * Retrieve saved UUID
 *
 * @returns {string} persisted UUID
 */

Client.getClientUUID = function() {
  var uuid;
  if (Client.cookiesEnabled()) {
    uuid = Cookie.get(COOKIE_NAME);
  } else {
    uuid = localCid;
  }

  return uuid;
};

/**
 * Delete persisted UUID 
 */

Client.deleteClientUUID = function() {
  if (Client.cookiesEnabled()) {
    Cookie.remove(COOKIE_NAME);
  } else {
    localCid = null;
  }
};

module.exports = Client;

