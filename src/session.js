/*global module:false */

var log = require('./log');
var Auth = require('./auth');
var Events = require('./events');
var Request = require('./request');
var Play = require('./play');
var Client = require('./client');
var Station = require('./station');
var _ = require('underscore');
var API_ERRORS = require('./error');

var DEFAULT_FORMATS = 'mp3';
var DEFAULT_BITRATE = 128;

 /**
 * @classdesc 
 *
 * This class talks to the Feed.fm REST API to pull audio items for
 * playback. It holds a {@link Session#currentPlay} that represents
 * the song that has started playback for the user, and the 
 * {@link Session#nextPlay}, which will be the next song to play when
 * the currentPlay is completed.
 *
 * A call to {@link Session#setCredentials} kicks off a request to
 * the Feed.fm servers to see if the client can play music. Either
 * a {@link Session#event:session-available} or 
 * {@link Session#event:session-not-available} event will be triggered
 * to indicate if the user is given a session to request music with.
 *
 * If {@link Session#event:session-available} is triggered, then the
 * client can call {@link Session#requestNextPlay} to kick off retrieval
 * of music for playback.
 *
 * The general usage of this class is:
 *
 * ```
 * var session = new Feed.Session();
 *
 * session.on('session-available', function() {
 *   // music is available for the user.
 *   // session.getStations() will return list of available stations.
 *   // use session.setStation() to pick station, if we don't want default
 *   session.requestNextPlay();   // start retrieving songs
 * });
 *
 * session.on('session-not-available', function() {
 *   // no music is available for the user for some reason
 * });
 *
 * session.on('next-play-available', function(nextPlay) {
 *   // if session.currentPlay is null, then try to start playback of
 *   // nextPlay and then call session.playStarted();
 *
 *   // if session.currentPlay is not null, then we could start
 *   // loading the audio data for nextPlay in anticipation of
 *   // playing this song next
 * });
 *
 * session.on('current-play-did-change', function(currentPlay) {
 *   // when currentPlay is not null, this means we just started
 *   // playback of currentPlay
 *
 *   // when currentPlay is null, it means we just completed playback
 *   // of a song. If nextPlay is not null, we should try to begin
 *   // playback of it and call session.rejectPlay() (if the song couldn't
 *   // be retrieved or started) or session.playStarted() followed by
 *   // session.requestSkip() or session.playCompleted().
 *   // Iff nextPlay is null then we're still waiting for the next
 *   // song and can expect a next-play-available event soon.
 * });
 *
 * session.on('no-music-available', function() {
 *   // no more music is available for the current station.
 * });
 *
 * session.setCredentials('token', 'secret'); // kicks off request to server for session
 * ```
 *
 * It is best to think of this class as constantly trying to
 * keep a song in the queue for playback. When you advance a song
 * in it from next to current (by calling {@link Session#playStarted}), the class
 * tries to get another song queued up for you automatically.
 *
 * This class can also be used to request specific audio files
 * by calling {@link Session#requestPlay} to request a specific
 * song.
 *
 * @constructor
 * @param {object} options - options for the session
 * @param {string} [options.audioFormats=mp3] - string with comma separated list of 
 *                                              preferred media formats: mp3 or aac
 * @param {string} [options.maxBitrate=128] - max bitrate (in kbps) of requested audio files
 * @mixes Events
 */

var Session = function(options) {
  if (!options) { options = {}; }

  // initialize state:
  this.auth = null;

  this.supportedAudioFormats = options.audioFormats || DEFAULT_FORMATS; // , separated string of 'aac', 'mp3'
  this.maxBitrate = options.maxBitrate || DEFAULT_BITRATE;      // max bitrate to request

  /** 
   * @readonly
   * @member {object} - reference to the station we're pulling songs from 
   */
  this.activeStation = null;

  /** 
   * @readonly
   * @member {object[]} - array of station objects that represent available
   *                       stations we can tune to 
   */
  this.stations = [];         // holds list of known stations

  /** 
   * @readonly
   * @member {boolean} - when true, music is available; when false, no music is available;
   *                      when null, we don't know if music is available yet
   */
  this.available = null;

  /**
   * @readonly
   * @member {object} - song that is currently being played back to user
   */
  this.currentPlay = null;

  /**
   * @readonly
   * @member {object} - song that is queued to be played next. This will become the
   *                     {@link Session#currentPlay} when {@link Session#playStarted}
   *                     is called.
   */
  this.nextPlay = null;

  this.nextPlayInProgress = false; // true if we're already waiting next play response

  this.requestsInProgress = [];  // network requests we're awaiting a response

  /**
   * @readonly
   * @member {boolean} - if false, the current song may not be skippedj
   */
  this.canSkip = false;

  // add event handling
  _.extend(this, Events);
};

/**
 * Save all the state variables for this instance into a simple
 * object so that we might recreate the state in the future
 * (or another window, for example).
 *
 * @return {object} a simple object to be passed to 
 *       {@link Session#unsuspend} at a later time.
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
 *
 * @param {object} state - value returned from {@link Session#suspend}
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
 * {@link Session#event:session-available} or 
 * {@link Session#event:session-not-available} being triggered.
 *
 * @param {string} token token provided by feed.fm
 * @param {string} secret secret provided by feed.fm
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
 * Assign new nextPlay. Trigger 'next-play-available' event
 * when non-null.
 *
 * @private
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

/**
 * Assign new currentPlay. Trigger 'current-play-did-change'
 * event.
 *
 * @private
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
 * an {@link Session#event:active-station-did-change} event. This kills
 * any background requests for new plays, throws away any
 * existing {@link Session#nextPlay} value, emits a {@link Session#event:discard-next-play}
 * event, and sets {@link Session#currentPlay}
 * to null. You'll need to
 * call {@link Session#requestNextPlay} to start pulling in new music after
 * making this call or receiving the {@link Session#event:active-station-did-change}
 * event.
 *
 * @param {object} station - a station (available from 
 *    {@link Session#stations})
 */

Session.prototype.setStation = function(station) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (station === this.activeStation) {
    log('ignoring attempt to re-set active station');
    return;
  }

  log('active station changed to ' + station);
  this.activeStation = station;
  
  this._reset();

  this.trigger('active-station-did-change', station);
};

/**
 * Ask the server to start a new session. This will
 * trigger a 'session-available' or 'session-not-available'
 * event.
 *
 * @private
 */

Session.prototype._requestSession = function() {
  var session = this;

  var sessionRequest = Request.requestSession();
  sessionRequest.auth = this.auth;

  sessionRequest.success = function(res) {
    if (!res.session) {
      session._handleUnexpectedError(new Error('FMErrorCodeUnexpectedReturnType'));

      return;
    }

    var cid = res.session.client_id;
    Client.setClientUUID(cid);

    if (res.session.available) {
      // session is available!
      log('session is available to this client');

      session.stations = [];
      for (var i = 0; i < res.stations.length; i++) {
        session.stations.push(new Station(res.stations[i]));
      }

      session.activeStation = session.stations[0];

      session.available = true;

      session.trigger('session-available', session.stations);

    } else {
      // session is not available to this client
      log('session is NOT available to this client');

      session.available = false;

      session.trigger('session-not-available');

    }
  };

  sessionRequest.failure = function(error) {
    session._handleUnexpectedError(new Error('unexpected response from session request ' + error));
  };

  sessionRequest.send();
};

/**
 * Add authentication credentials to the given request,
 * make a note that we're sending it, then send it out.
 *
 * @private
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

/**
 * Cancel any outstanding requests we might be waiting on.
 *
 * @private
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
 * {@link Session#event:next-play-available} event is triggered.
 * Note that if a {@link Session#nextPlay} is already not null
 * and this method is called, nothing will happen.
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

/**
 * A call to this method causes any existing {@link Session#nextPlay}
 * value to be discarded and {@link Session#currentPlay} to be set
 * to null. Then a request is made to the server for a play
 * with the provided audio file and things resume just as
 * if a call to {@link Session#requestNextPlay} were made.
 *
 * If the user is not allowed to play the requested file, an
 * {@link unexpected error will be triggered and music retrieval
 * will not progress.
 *
 * @param {AudioFile} audioFile - the audio file you wish to play
 */

Session.prototype.requestPlay = function(audioFile) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  var session = this;
  this._reset();

  var playRequest = Request.requestPlay(this.activeStation.id, 
                this.supportedAudioFormats, this.maxBitrate, audioFile.id);

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

/**
 * Stop any pending requests and throw away current
 * and next play values.
 *
 * @private
 */

Session.prototype._reset = function() {
  this._cancelOutstandingRequests();

  if (this.nextPlay) {
    var nextPlay = this.nextPlay;
    this.nextPlay = null;
    this.trigger('discard-next-play', nextPlay);
  }

  this._setCurrentPlay(null);
};

Session.prototype._nextPlaySucceeded = function(nextPlay) {
  log('next play fetch succeeded');

  this.nextPlayInProgress = false;

  this._setNextPlay(nextPlay);
};

Session.prototype._nextPlayFailed = function(err) {
  log('next play fetch failed');

  this.nextPlayInProgress = false;

  if (this.currentPlay === null) {
    if (err.code === API_ERRORS.noMoreMusic.id) {  // no more music.
      this.trigger('no-more-music');

    } else {
      this._handleUnexpectedError(err);
    }

  } else {
    // we've got an active song; rather than immediately
    // report an error, just ignore this and we'll
    // try again when reportComplete() is called.

  }
};

/**
 * After playback of the {@link Session#nextPlay} has begun, call this
 * method to promote the play to {@link Session#currentPlay},
 * null out the value of {@link Session#nextPlay},
 * tell the server we have started playback, and start requesting the
 * next value for {@link Session#nextPlay}.
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
 * Inform the server that we have elapsed playback. This may be
 * called multiple times during playback.
 *
 * @param {number} elapsedTime - total number of seconds of the 
 *   current song that have played since the song started.
 */

Session.prototype.updatePlay = function(elapsedTime) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (this.currentPlay && this.currentPlay.id) {
    var elapseRequest = Request.requestElapse(this.currentPlay.id, elapsedTime);

    elapseRequest.failure = function(err) {
      log('ignoring bad response to elapse request: ' + err.toString());
    };

    this._sendRequest(elapseRequest);
  }
};

/**
 * Inform the server that the current song has completed,
 * set {@link Session#currentPlay} to null, and ensure that
 * a request for the next song is in progress or has completed.
 *
 * @param {boolean} [dueToError] if true, then playback completed due to an error
 */

Session.prototype.playCompleted = function(dueToError) {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  if (dueToError) {
    if (this.currentPlay) {
      this._oneShotRequest(Request.requestInvalidate);
    }
  } else {
    this._oneShotRequest(Request.requestComplete);
  }
  
  this._setCurrentPlay(null);

  if (!this.nextPlay && !this.nextPlayInProgress) {
    // We might have run out of music. Ask the server again for a song
    this.requestNextPlay();
  }
};

/**
 * Mark the currently playing songs as liked.
 */

Session.prototype.requestLike = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestLike);
};

/**
 * Mark the currently playing song as neither liked nor disliked.
 */

Session.prototype.requestUnlike = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestUnlike);
};

/**
 * Mark the currently playing song as disliked.
 */

Session.prototype.requestDislike = function() {
  if (this.auth === null) { throw new Error('setCredentials has not been called on Session'); }

  this._oneShotRequest(Request.requestDislike);
};

/**
 * Send a simple request to the server that
 * requires the current play id. Ignore successful
 * response and log error response.
 *
 * @private
 */

Session.prototype._oneShotRequest = function(ctor) {
  if (!this.currentPlay) {
    return;
  }

  var playId = this.currentPlay.id;

  var request = ctor(playId);
  request.failure = function(err) {
    log('failure response on one-shot-request: ' + err.toString());
  };

  this._sendRequest(request);
};

/**
 * Ask the server if we can skip the current song.
 * Call the optional success or failure functions depending on
 * the response. If the server allows the skip, then
 * a virtual {@link Session#playCompleted} call is made you can
 * expect a {@link Session#event:current-play-did-change} event
 * that sets {@link Session#currentPlay} to null. If the
 * server disallows the skip (despite {@link Session#canSkip} being
 * true) a {@link Session#event:skip-status-did-change}
 * event is triggered.
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
      session._handleUnexpectedError(err);
    }
  };

  this._sendRequest(skipRequest);
};

/**
 * If we are unable to start playback of {@link Session#nextPlay},
 * then call this (with no arguments) in place of
 * {@link Session#playStarted} to report
 * the song as being unplayable. This will kick off a request for
 * a new {@link Session#nextPlay} value (and associated 
 * {@link Session#event:next-play-available} event).
 */

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

/**
 * Cancel any outstanding tasks and destroy 
 * any resources we are using. This object is
 * unusable after this call.
 */

Session.prototype.destroy = function() {
  this._cancelOutstandingRequests();
};

/**
 * Deal with some unexpected server response.
 *
 * @private
 */

Session.prototype._handleUnexpectedError = function(err) {
  if (this.available === null) {
    log('unexpected error before session available leads to no session available');
    this.available = false;

    this.trigger('session-not-available');

  } else if (this.available) {
    log('unexpected error after sesion available - so triggering unexpected error and resetting things');

    this._reset();

    this.trigger('unexpected-error', err);

  } else {
    log('swallowing error since session is not available');
  }
};

/**
 * This indicates a response was received from the Feed.fm servers
 * and music is available for this client. This event is triggered
 * after {@link Session#setCredentials} is called. Upon receipt of
 * this event, {@link Session#requestNextPlay} should be called to
 * kick of retrieving music from Feed.fm.
 *
 * An array of {@link Station} entries is passed along with this
 * event.
 *
 * @event Session#session-available
 */

/**
 * This indicates a response was received from the Feed.fm servers
 * and they say this client may not retrieve music. This event is
 * triggered after {@link Session#setCredentials} is called.
 *
 * @event Session#session-not-available
 */

/**
 * This indicates {@link Session#nextPlay} has a non-null
 * value.
 *
 * @event Session#next-play-available
 * @type {Play}
 */

/**
 * This indicates we've thrown away the {@link Session#nextPlay}
 * value, and any resources related to it can be thrown away.
 *
 * @event Session#discard-next-play
 * @type {Play}
 */

/**
 * This indicates the {@link Session#currentPlay} value has
 * changed. The new value may be null (indicating the most
 * recently playing song completed) or non-null (indicating
 * {@link Session#playStarted} has been called and what was
 * previously the {@link Session#nextPlay} has now become
 * the {@link Session#currentPlay}.
 *
 * @event Session#current-play-did-change
 * @type {Play}
 */

/**
 * This indicates that the {@link Session#activeStation}
 * values has changed. A call to {@link Session#requestNextPlay}
 * should be made to kick off retrieval of music from this
 * new station.
 *
 * @event Session#active-station-did-change
 * @type {Station}
 */

/**
 * This indicates the {@link Session#canSkip} value has changed
 *
 * @event Session#skip-status-did-change
 */

/**
 * This indicates no more music is available in the current
 * station and retrieval of music from Feed.fm has stopped.
 *
 * @event Session#no-more-music
 */

/**
 * This indicates an unexpected error was received from the
 * server. This can only be triggered sometime after we've triggered
 * a {@link Session#event:session-available} event. Before
 * this is triggered, any {@link Session#nextPlay} will be
 * discarded and the {@link Session#currentPlay} will be set
 * to null, which effectively resets the session. 
 * No more plays will be requested until
 * {@link Session#requestNextPlay} is called again.
 *
 * @event Session#unexpected-error
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
 *
 */


module.exports = Session;
