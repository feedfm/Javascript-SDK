/*global module:false */

/**
 *  Feed Media Session API
 *
 *  This class is based on the iOS FMSession class.
 *
 *  This class talks to the Feed.fm REST API to pull audio items for playback. It holds a 'currentItem'
 *  that represents the song that has started playback for the user, and the 'nextItem', which will
 *  be the next song to play when the current one is completed or skipped. Clients of this class
 *  should 'requestNextItem' and listen for 'next-item-available' events to know
 *  when the next item has been retrieved. Clients should then call 'playStarted' when they start
 *  playback of the 'nextItem', which will make it the 'currentItem' and kick off a background task
 *  to call 'requestNextItem' to retrieve a new 'nextItem'. When playback of the currentItem is
 *  completed or the client wants to skip the current item, a call to 'playCompleted' or 'requestSkip'
 *  should be made; then the client should try to start playback of 'nextItem' if it exists, or call
 *  'requestNextItem' otherwise.
 *
 *  It is best to think of this class as constantly trying to keep a song in the queue for playback.
 *  When you advance a song in it from next to current (by calling 'playStarted'), the class tries
 *  to get another song queued up for you as the next song automatically.
 *
 *  This class requires that you pass it a token and secret so that it can sign
 *  requests and retrieve a client UUID for interacting with the API service.
 *
 *  This class saves the client UUID as a cookie or in local HTML storage so it can be
 *  reused with future requests.
 *
 *  This class emits a number of events:
 *
 *    session-not-available
 *    session-available
 *    next-item-available
 *    current-item-did-change
 *    active-station-did-change
 *    unexpected-error
 *    skip-status
 *    no-more-music
 *
 */

/*
 * missing functionality:
 *   got rid of canRequestItems
 *   timeUpdate() and the trigger that watches the system clock
 *   not queueing up calls made before session availability
 *   event logging
 * changes:
 *   FMAudioItem is now Play
 *   added getStations() call to retrieve list of stations
 *     removed the stations-list event as well
 *   when trying to retrieve the next play, increase number of retries when
 *     there is an existing curentItem.
 */

var log = require('./log');
var Auth = require('./auth');
var Events = require('./events');
var Request = require('./request');
var Play = require('./play');
var Station = require('./station');
var _ = require('underscore');

var DEFAULT_FORMATS = 'mp3';
var DEFAULT_BITRATE = 128;

/**
 * Create a new session. Optionally pass in an options object
 * with the following properties:
 *
 *   audioFormats = string with comma separated list of preferred
 *                  media formats: mp3 or aac
 *
 **/

var Session = function(options) {
  if (!options) { options = {}; }

  // initialize state:
  this.auth = null;

  this.supportedAudioFormats = options.audioFormats || DEFAULT_FORMATS; // , separated string of 'aac', 'mp3'
  this.maxBitrate = DEFAULT_BITRATE;      // max bitrate to request

  this.activeStation = null;  // holds ref to active station
  this.stations = [];         // holds list of known stations

  this.available = null; // true = music available, false = no music available, null = unknown

  this.currentItem = null;         // ref to current 'active' item
  this.nextItem = null;            // ref to queued 'next' item
  this.nextItemInProgress = false; // true if we're already waiting next item response

  this.requestsInProgress = [];  // network requests we're awaiting a response

  this.canSkip = true;     // if false, the current song may not be skipped

  // add event handling
  _.extend(this, Events);
};

/**
 * Assign public and private tokens and kick off request to
 * ask server for a session, leading ultimately to
 * 'session-available' or 'session-not-available' being triggered.
 */

Session.prototype.setCredentials = function(token, secret) {
  this._cancelOutstandingRequests();

  this.auth = new Auth();
  this.auth.token = token;
  this.auth.secret = secret;

  log('credentials set to ' + token + ', ' + secret);

  this._requestSession();
};

/**
 * Zero out any current and next items, cancel any outstanding
 * requests, and then request a new next item.
 */

Session.prototype.resetAndRequestNextItem = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (this.currentItem !== null) {
    log('resetting current item');
    this.currentItem = null;
  }

  if (this.nextItem !== null) {
    log('resetting next item');
    this.nextItem = null;
  }

  this._cancelOustandingRequests();
};

/*
 * Assign new nextItem. Trigger 'next-item-available' event
 * when non-null.
 */

Session.prototype._setNextItem = function(nextItem) {
  if (nextItem === this.nextItem) { 
    log('ignoring attempt to re-set nextItem');
    return; 
  }

  this.nextItem = nextItem;

  if (nextItem !== null) {
    log('next item set to ' + nextItem);
    this.trigger('next-item-available', nextItem);

  } else {
    log('next item cleared');

  }
};

/*
 * Assign new currentItme. Trigger 'current-item-did-change'
 * event.
 */

Session.prototype._setCurrentItem = function(currentItem) {
  if (currentItem === this.currentItem) { 
    log('ignoring attempt to re-set currentItem');
    return; 
  }

  this.currentItem = currentItem;

  log('current item set to ' + currentItem);

  this.trigger('current-item-did-change', currentItem);
};

/**
 * Set the current station from which we pull music.
 */

Session.prototype.setStation = function(station) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (station === this.activeStation) {
    log('ignoring attempt to re-set active station');
    return;
  }

  log('active station changed to ' + station);
  this.activeStation = station;
  
  this._cancelOutstandingRequests();
  this.currentItem = null;
  this.nextItem = null;

  this.trigger('active-station-did-change');
};

/*
 * Ask the server to start a new session. This will
 * trigger a 'session-available' or 'session-not-available'
 * event.
 */

Session.prototype._requestSession = function() {
  var session = this;

  var sessionRequest = Request.requestSession();
  sessionRequest.auth = this.auth;

  sessionRequest.success = function(res) {
    if (!res.session) {
      session.handleUnexpectedError(new Error('FMErrorCodeUnexpectedReturnType'));

      return;
    }

    var cid = res.session.client_id;
    session.auth.setClientUUID(cid);

    if (res.session.available) {
      // session is available!
      log('session is available to this client');

      session.stations = [];
      for (var i = 0; i < res.stations.length; i++) {
        session.stations.push(new Station(res.stations[i]));
      }

      session.activeStation = session.stations[0];

      session.available = true;

      session.trigger('session-available');

    } else {
      // session is not available to this client
      log('session is NOT available to this client');

      session.available = false;

      session.trigger('session-not-available');

    }
  };

  sessionRequest.failure = function(error) {
    session.handleUnexpectedError(new Error('unexpected response from session request ' + error));
  };

  sessionRequest.send();
};

/*
 * Add authentication credentials to the given request,
 * make a note that we're sending it, then send it out.
 */

Session.prototype._sendRequest = function(req) {
  var session = this;
  var origSuccess = req.success;
  var origFailure = req.failure;

  req.auth = this.auth;

  req.success = function(result) {
    if (origSuccess) {
      origSuccess(result);
    }

    var index = session.requestsInProgress.indexOf(req);
    if (index > -1) {
      session.requestsInProgress.splice(index, 1);
    }
  };

  req.failure = function(result) {
    if (origFailure) {
      origFailure(result);
    }

    var index = session.requestsInProgress.indexOf(req);
    if (index > -1) {
      session.requestsInProgress.splice(index, 1);
    }
  };

  this.requestsInProgress.push(req);
  req.send();
};

/*
 * Cancel any outstanding requests we might be waiting on.
 */

Session.prototype._cancelOutstandingRequests = function() { 
  while (this.requestsInProgress.length > 0) {
    var request = this.requestsInProgress.shift();

    log('cancelling request ' + this.request);
    
    request.cancel();
  }

  log('no more outstanding requests');

  this.nextItemInProgress = false;
};

/**
 * Request a new play if we aren't already getting one or
 * have one already.
 */

Session.prototype.requestNextItem = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  if ((this.nextItem !== null) || this.nextItemInProgress) {
    return;
  }

  this.nextItemInProgress = true;

  var playRequest = Request.requestPlay(this.activeStation.id, 
                this.supportedAudioFormats, this.maxBitrate);

  playRequest.success = function(res) {
    var nextItem;
    
    if (res.play) {
      nextItem = new Play(res.play);
    }

    if (nextItem) {
      session._nextItemSucceeded(nextItem);
    } else {
      session._nextItemFailed(new Error('FMErrorCodeUnexpectedReturnType'));
    }
  };

  playRequest.failure = function(err) {
    session._nextItemFailed(err);
  };

  this._sendRequest(playRequest);
};

Session.prototype._nextItemSucceeded = function(nextItem) {
  log('next item fetch succeeded');

  this.nextItemInProgress = false;

  this._setNextItem(nextItem);
};

Session.prototype._nextItemFailed = function(err) {
  log('next item fetch failed');

  this.nextItemInProgress = false;

  if (err.message = 'FMErrorCodeNoAvailableMusic') {
    this.trigger('no-more-music');

  } else {
    this._handleUnexpectedError(err);
  }
};

/**
 * After playback of the nextItem has begun, call this
 * method to promote the nextItem to the currentItem
 * and tell the server we have started playback.
 */

Session.prototype.playStarted = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  if (!this.nextItem) {
    return;
  }

  this._setCurrentItem(this.nextItem);
  this._setNextItem(null);

  var startRequest = Request.requestStart(this.currentItem.id);

  startRequest.success = function(res) {
    session.canSkip = !!(res.can_skip);
    session.trigger('skip-status', session.canSkip);

    session.requestNextItem();
  };

  startRequest.failure = function(err) {
    session._handleUnexpectedError(err);
  };

  this._sendRequest(startRequest);
};

/**
 * Inform the server that we have elapsed playback
 */

Session.prototype.updatePlay = function(elapsedTime) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (this.currentItem && this.currentItem.id) {
    var elapseRequest = Request.requestElapse(this.currentItem.id, elapsedTime);

    this._sendRequest(elapseRequest);
  }
};

/**
 * Inform the server that the current song has completed,
 * and clear out the current item.
 */

Session.prototype.playCompleted = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestComplete);
  
  this.setCurrentItem(null);
};

/**
 * Mark the currently playing songs as liked.
 */

Session.prototype.requestLike = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestLike);
};

/**
 * Remove a like from the current song
 */

Session.prototype.requestUnlike = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestUnlike);
};

/**
 * Mark a song as disliked
 */

Session.prototype.requestDislike = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestDislike);
};

/*
 * Send a simple request to the server that
 * requires the current play id. Ignore successful
 * response and log error response.
 */

Session.prototype._oneShotRequest = function(ctor) {
  var session = this;

  if (!this.currentItem) {
    return;
  }

  var playId = this.currentItem.id;

  var request = ctor(playId);
  request.failure = function(err) {
    session.handleUnexpectedError(err);
  };

  this._sendRequest(request);
};

/**
 * Ask the server if we can skip the current song.
 * Call the success or failure arguments depending on
 * the response.
 */

Session.prototype.requestSkip = function(success, failure) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  if (this.currentItem === null) {
    log('tried to skip but no currently playing song');
    if (failure) {
      failure(new Error('FMErrorCodeInvalidSkip'));
    }
    return;
  }

  var skipRequest = Request.requestSkip(this.currentItem.id, -1);
  skipRequest.success = function() {
    session.setCurrentItem(null);

    if (success) {
      success();
    }
  };

  skipRequest.failure = function(err) {
    session.canSkip = false;
    if (failure) {
      failure(err);
    } else {
      session.handleUnexpectedError(err);
    }
  };

  this._sendRequest(skipRequest);
};

Session.prototype.rejectItem = function(item) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  var isCurrentItem = (item === this.currentItem);
  var isNextItem = (item === this.nextItem);

  if (isCurrentItem) {
    this.setCurrentItem(null);

  } else if (isNextItem) {
    this.setNextItem(null);

  } else {
    // not current or next item - nobody cares!
    return;
  }

  var invalidateRequest = Request.requestInvalide(item.id);
  invalidateRequest.success = function() {
    log('invalidate success!');
    if (isNextItem) {
      session.requestNextItem();
    }
  };

  invalidateRequest.failure = function(err) {
    session.handleError(err);
  };

  this._sendRequest(invalidateRequest);
};

Session.prototype.handleUnexpectedError = function(err) {
  if (err.message === 'FMErrorCodeInvalidRegion') {
    log('invalid region!');
    this.trigger('session-not-available');

  } else {
    if (this.available === null) {
      log('fatal error leads to no session available');
      this.available = false;

      this.trigger('session-not-available');

    } else {
      this.trigger('unexpected-error', err);
    }
  }
};


module.exports = Session;
