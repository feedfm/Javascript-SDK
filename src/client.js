/*global module:false */

var log = require('./log');
var Cookie = require('tiny-cookie');

var COOKIE_NAME = 'cid';

/**
 * The Client class keeps track of the client's
 * UUID value.
 */

var localCid = '';

var Client = { };

/**
 * Returns true if the client will let us set cookies.
 */

Client._cookiesEnabled = Cookie.enabled();
Client.cookiesEnabled = function() {
  return Client._cookiesEnabled;
};

/**
 * Persist client UUID as a cookie and save it for signed
 * requests.
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

Client.getClientUUID = function() {
  if (Client.cookiesEnabled()) {
    return Cookie.get(COOKIE_NAME);
  } else {
    return localCid;
  }
};

/**
 * Delete the persisted UUID cookie
 */

Client.deleteClientUUID = function() {
  if (Client.cookiesEnabled()) {
    Cookie.remove(COOKIE_NAME);
  } else {
    localCid = null;
  }
};

module.exports = Client;

