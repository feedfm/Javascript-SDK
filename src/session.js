/*global module:false */

/**
 *  Feed Media Session API
 *
 *  This class is based on the iOS FMSession class.
 *
 *  This class talks to the Feed.fm REST API to pull audio items for playback. It holds a 'currentPlay'
 *  that represents the song that has started playback for the user, and the 'nextPlay', which will
 *  be the next song to play. 
 *
 *  The general usage of this class is:
 *
 *  var session = new Feed.Session();
 *
 *  session.on('session-available', function() {
 *    // music is available for the user.
 *    // session.getStations() will return list of available stations.
 *    // use session.setStation() to pick station, if we don't want default
 *    session.requestNextPlay();   // start retrieving songs
 *  });
 *
 *  session.on('session-not-available', function() {
 *    // no music is available for the user for some reason
 *  });
 *
 *  session.on('next-play-available', function(nextPlay) {
 *    // if session.currentPlay is null, then try to start playback of
 *    // nextPlay and then call
 *
 *    session.playStarted();
 *
 *    // now session.currentPlay becomes nextPlay
 *    // when playback of session.currentPlay completes, call
 *    // session.playCompleted();
 *  });
 *
 *  session.on('current-play-changed', function(currentPlay) {
 *    // when currentPlay is not null, this means we just started playback of currentPlay
 *    // when currentPlay is null, it means we just completed playback of a song,
 *    //    and if nextPlay is not null, we should begin playback of it and call session.playStarted()
 *    //        else nextPlay is null and we're waiting for the next song
 *  });
 *
 *  session.on('no-music-available', function() {
 *    // no more music is available for the current station at the moment
 *  });
 *
 *  session.setCredentials('token', 'secret'); // kicks off request to server for session
 *
 *  It is best to think of this class as constantly trying to keep a song in the queue for playback.
 *  When you advance a song in it from next to current (by calling 'playStarted'), the class tries
 *  to get another song queued up for you automatically.
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
 *
 *    next-play-available
 *    current-play-did-change
 *
 *    active-station-did-change
 *    skip-status-did-change
 *    no-more-music
 *
 *    unexpected-error
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
 *   renamed currentItem and nextItem to currentPlay and nextPlay
 *   added getStations() call to retrieve list of stations
 *     removed the stations-list event as well
 *   when trying to retrieve the next play, increase number of retries when
 *     there is an existing curentPlay.
 *   skip-status is only triggered when the status actually changes
 *   default canSkip value is false
 *   skip-status renamed to skip-status-did-change
 *   no-more-music is only triggered after completion of any actively
 *     playing song
 *   you can only reject the 'nextPlay', since the 'reportStart' means
 *     you got the song playing...
 *   added suspend() and unsuspend()
 * learnings:
 *   check for available play credits when making session, so shortcut need for
 *     requestNextPlay()
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

  this.available = null;      // true = music available, false = no music available, null = unknown

  this.currentPlay = null;         // ref to current 'active' play
  this.nextPlay = null;            // ref to queued 'next' play
  this.nextPlayInProgress = false; // true if we're already waiting next play response

  this.requestsInProgress = [];  // network requests we're awaiting a response

  this.canSkip = false;     // if false, the current song may not be skipped

  // add event handling
  _.extend(this, Events);
};

/**
 * Save all the state variables for this instance so that we might
 * recreate the state in the future (or another window, for example).
 */

Session.prototype.suspend = function(elapsed) {
  var state = {
    token: this.auth.token,
    secret: this.auth.secret,
    elapsed: elapsed,
    available: this.available,
    currentPlay: this.currentPlay,
    nextPlay: this.nextPlay,
    nextPlayInProgress: this.nextPlayInProgress,
    canSkip: this.canSkip
  };

  return state;
};

/**
 * Restore the state of this session from a previously suspended
 * station.
 */

Session.prototype.unsuspend = function(state) {
  this._cancelOutstandingRequests();

  this.auth = new Auth();
  this.auth.token = state.token;
  this.auth.secret = state.secret;

  this.available = state.available;
  this.currentPlay = state.currentPlay;
  this.nextPlay = state.nextPlay;
  this.canSkip = state.canSkip;

  if (state.nextPlayInProgress) {
    this.requestNextPlay();
  }

  return state.elapsed;
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
 * Zero out any current and next play, cancel any outstanding
 * requests, and then request a new next play.
 */

Session.prototype.resetAndRequestNextPlay = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (this.currentPlay !== null) {
    log('resetting current play');
    this.currentPlay = null;
  }

  if (this.nextPlay !== null) {
    log('resetting next play');
    this.nextPlay = null;
  }

  this._cancelOustandingRequests();
};

/*
 * Assign new nextPlay. Trigger 'next-play-available' event
 * when non-null.
 */

Session.prototype._setNextPlay = function(nextPlay) {
  if (nextPlay === this.nextPlay) { 
    log('ignoring attempt to re-set nextPlay');
    return; 
  }

  this.nextPlay = nextPlay;

  if (nextPlay !== null) {
    log('next play set to ' + nextPlay);
    this.trigger('next-play-available', nextPlay);

  } else {
    log('next play cleared');

  }
};

/*
 * Assign new currentPlay. Trigger 'current-play-did-change'
 * event.
 */

Session.prototype._setCurrentPlay = function(currentPlay) {
  if (currentPlay === this.currentPlay) { 
    log('ignoring attempt to re-set currentPlay');
    return; 
  }

  this.currentPlay = currentPlay;

  log('current play set to ' + currentPlay);

  this.trigger('current-play-did-change', currentPlay);
};

/**
 * Set the current station from which we pull music and trigger
 * an 'active-station-did-change' event. This kills
 * any background requests for new plays and throws away any
 * existing 'nextPlay'. You'll need to
 * call 'requestNextPlay()' to start pulling in new music after
 * making this call or receiving the 'active-station-did-change'
 * event.
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
  this.currentPlay = null;
  this.nextPlay = null;

  this.trigger('active-station-did-change', station);
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
    Auth.setClientUUID(cid);

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

  this.nextPlayInProgress = false;
};

/**
 * Request a new play if we aren't already getting one or
 * have one already. When a new play is retrieved, a 
 * 'next-play-available' event is triggered. Note that if
 * a nextPlay is already available and this method is called,
 * it will not trigger a new 'next-play-available' event - so
 * make sure you check wether there is a nextPlay before
 * calling this.
 */

Session.prototype.requestNextPlay = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  if ((this.nextPlay !== null) || this.nextPlayInProgress) {
    return;
  }

  this.nextPlayInProgress = true;

  var playRequest = Request.requestPlay(this.activeStation.id, 
                this.supportedAudioFormats, this.maxBitrate);

  playRequest.success = function(res) {
    var nextPlay;
    
    if (res.play) {
      nextPlay = new Play(res.play);
    }

    if (nextPlay) {
      session._nextPlaySucceeded(nextPlay);
    } else {
      session._nextPlayFailed(new Error('FMErrorCodeUnexpectedReturnType'));
    }
  };

  playRequest.failure = function(err) {
    session._nextPlayFailed(err);
  };

  this._sendRequest(playRequest);
};

Session.prototype._nextPlaySucceeded = function(nextPlay) {
  log('next play fetch succeeded');

  this.nextPlayInProgress = false;

  this._setNextPlay(nextPlay);
};

Session.prototype._nextPlayFailed = function(err) {
  log('next play fetch failed');

  this.nextPlayInProgress = false;

  if (err.message = 'FMErrorCodeNoAvailableMusic') {
    if (this.currentPlay === null) {
      this.trigger('no-more-music');

    } // else swallow this, and reportComplete() will kick off another try 
      // upon completion of the playing song.

  } else {
    this._handleUnexpectedError(err);
  }
};

/**
 * After playback of the nextPlay has begun, call this
 * method to promote the nextPlay to the currentPlay
 * and tell the server we have started playback.
 */

Session.prototype.playStarted = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  if (!this.nextPlay) {
    return;
  }

  this._setCurrentPlay(this.nextPlay);
  this._setNextPlay(null);

  var startRequest = Request.requestStart(this.currentPlay.id);

  startRequest.success = function(res) {
    var oldCanSkip = session.canSkip;
    session.canSkip = !!(res.can_skip);

    if (oldCanSkip !== session.canSkip) {
      session.trigger('skip-status-did-change', session.canSkip);
    }

    session.requestNextPlay();
  };

  startRequest.failure = function(err) {
    if (err.code === 20) {
      // server thinks we started this already.. let's pretend this
      // is a successful start
      session.requestNextPlay();

      return;
    }

    session._handleUnexpectedError(err);
  };

  this._sendRequest(startRequest);
};

/**
 * Inform the server that we have elapsed playback
 */

Session.prototype.updatePlay = function(elapsedTime) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (this.currentPlay && this.currentPlay.id) {
    var elapseRequest = Request.requestElapse(this.currentPlay.id, elapsedTime);

    this._sendRequest(elapseRequest);
  }
};

/**
 * Inform the server that the current song has completed,
 * and clear out the current play.
 */

Session.prototype.playCompleted = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestComplete);

  if (!this.nextPlay && !this.nextPlayInProgress) {
    // We might have run out of music. Ask the server again for a song
    this.requestNextPlay();
  }
  
  this._setCurrentPlay(null);

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

  if (!this.currentPlay) {
    return;
  }

  var playId = this.currentPlay.id;

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

  if (this.currentPlay === null) {
    log('tried to skip but no currently playing song');
    if (failure) {
      failure(new Error('FMErrorCodeInvalidSkip'));
    }
    return;
  }

  var skipRequest = Request.requestSkip(this.currentPlay.id, -1);
  skipRequest.success = function() {
    session._setCurrentPlay(null);

    if (!session.nextPlay && !session.nextPlayInProgress) {
      // We might have run out of music. Ask the server again for a song
      session.requestNextPlay();
    }

    if (success) {
      success();
    }
  };

  skipRequest.failure = function(err) {
    if (err.code === 9) {
      if (session.canSkip) {
        session.canSkip = false;

        session.trigger('skip-status-did-change', session.canSkip);
      }

      if (failure) {
        failure(err);
      }

      return;
    }

    if (failure) {
      failure(err);
    } else {
      session.handleUnexpectedError(err);
    }
  };

  this._sendRequest(skipRequest);
};

Session.prototype.rejectPlay = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;

  if (!this.nextPlay) {
    return;
  }

  var play = this.nextPlay;

  this._setNextPlay(null);

  var invalidateRequest = Request.requestInvalidate(play.id);
  invalidateRequest.success = function() {
    log('invalidate success!');
    session.requestNextPlay();
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
