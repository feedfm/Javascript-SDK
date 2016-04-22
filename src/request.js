/*global module:false */

var log = require('./log');
var Base64 = require('js-base64').Base64;
var Cookie = require('tiny-cookie');
var $ = require('jquery');
var FMError = require('./fmerror');
var Client = require('./client');

var Request = function() {
  this.type = null;
  this.endpoint = null;
  this.success = null;
  this.failure = null;
  this.error = null;
  this.data = { };
  this.retryCount = 3;
  this.retryDelay = 500;
};

Request.userAgent = function() {
  return 'FeedMediaSDK/Javascript';
};

Request.serviceEndpoint = function() {
  return 'https://feed.fm/api/v2/';
};

Request.prototype.toString = function() {
  if ((this.type === null) || (this.endpoint === null)) {
    return 'uninitialized HTTP request';
  } else {
    return this.type + ' ' + this.endpoint + ' HTTP request';
  }
};

/**
 * Cancel this request so that the success and failure callbacks aren't
 * called and the request isn't retried.
 */

Request.prototype.cancel = function() {
  this.success = null;
  this.failure = null;
  this.retryCount = 0;
};

/**
 * Send the request to the server. If the request fails, then try again
 * based on the retryCount. If there are no more retries available after
 * a failure or the server gives us a parseable response, call the failure
 * callback and quit.
 */

Request.prototype.send = function() {
  var request = this;

  var ajax = {
    dataType: 'json',
    timeout: 6000
  };

  ajax.headers = {
    'x-user-agent': Request.userAgent()
  };

  if (this.auth && this.auth.token) {
    ajax.headers.Authorization = 'Basic ' + Base64.encode(this.auth.token + ':' + this.auth.secret);
  }

  ajax.type = this.type;
  ajax.url = Request.serviceEndpoint() + this.endpoint;
  ajax.data = this.data;

  if (!Client.cookiesEnabled()) {
    var cid = Client.getClientUUID();
  console.log('no cookies, so getting UUID', cid);
    if (cid) {
      ajax.data.client_id = cid;
    }
  } else {
  console.log('found cookies');
  }

  log(this.toString() + ': sending request to ' + ajax.url);

  $.ajax(ajax)
    .then(function(res) {
      if (!res.success) {
        var error;

        if (res.error) {
          error = new FMError(res.error.message, res.error.code);
        } else {
          error = new Error('Unexpected return type');
        }

        log(request.toString() + ': server returned error=true ' + error);

        if (request.failure) {
          request.failure(error);
        }

        return;
      }

      log(request.toString() + ': server returned success!');

      if (request.success) {
        request.success(res);
      }
    })

    .fail(function(jqXHR) {
      var hasRetriesLeft = (request.retryCount !== 0);
      var isRecoverable = true;
      var error;

      log(request.toString() + ': server returned error: ' + jqXHR.responseText);

      try {
        var jsonResponse = $.parseJSON(jqXHR.responseText);

        isRecoverable = false;

        if (jsonResponse.error) {
          error = new FMError(jsonResponse.error.message, jsonResponse.error.code);

        } else {
          error = new Error(jqXHR.responseText);
        }

      } catch (e) {
        // ignore - request should be retried because we didn't
        //          get a parseable response from the server
      }

      if (hasRetriesLeft && isRecoverable) {
        request.retryCount--;

        setTimeout(function() {
          log(request.toString() + ': retrying');
          request.send();
        }, request.retryDelay);

        if (request.retryDelay < 2000) {
          request.retryDelay = request.retryDelay * 2;
        }

        return;

      } else { 
        log(request.toString() + ': not going to retry');
      }

      if (!error) {
        error = new Error(jqXHR.responseText);
      }

      if (request.failure) {
        request.failure(error);
      }
    });
};

/*
 * Return true if the client will hold cookies.
 */

var enabled = null;
Request._cookiesEnabled = function() {
  if (enabled === null) {
    enabled = Cookie.enabled();
  }
  return enabled;
};

/**
 * Create request object to request a new session.
 */

Request.requestSession = function() {
  var req = new Request();
  req.endpoint = 'session';
  req.type = 'POST';

  return req;
};

/**
 * Create request object to request a new play
 */

Request.requestPlay = function(stationId, audioFormats, maxBitrate) {
  var req = new Request();
  req.endpoint = 'play';
  req.type = 'POST';
  req.retryCount = 3;  // if this fails, the user can retry later

  req.data.station_id = stationId;
  req.data.formats = audioFormats;
  req.data.max_bitrate = maxBitrate;

  return req;
};

/**
 * Create request object to notify of play start
 */

Request.requestStart = function(playId) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/start';
  req.type = 'POST';

  return req;
};

/**
 * Create request to tell server that playback has occurred.
 */

Request.requestElapse = function(playId, elapsedTime) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/elapse';
  req.type = 'POST';

  req.data.seconds = elapsedTime;

  return req;
};

/**
 * Create request to ask server if we can skip song
 */

Request.requestSkip = function(playId, elapsedTime) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/skip';
  req.type = 'POST';

  if (elapsedTime > 0) {
    req.data.seconds = elapsedTime;
  }

  return req;
};

/**
 * Create request to tell server we couldn't play a song
 */

Request.requestInvalidate = function(playId) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/invalidate';
  req.type = 'POST';

  return req;
};

/**
 * Create request to tell server a song playback is complete
 */

Request.requestComplete = function(playId) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/complete';
  req.type = 'POST';

  return req;
};

/**
 * Create request to tell server we like a play
 */

Request.requestLike = function(playId) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/like';
  req.type = 'POST';

  return req;
};

/**
 * Create request to tell server we rescind a like to a play.
 */

Request.requestUnlike = function(playId) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/like';
  req.type = 'DELETE';

  return req;
};

/**
 * Create request to tell server we dislike a song.
 */

Request.requestDislike = function(playId) {
  var req = new Request();
  req.endpoint = 'play/' + playId + '/dislike';
  req.type = 'POST';

  return req;
};

module.exports = Request;


