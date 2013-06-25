/*global _:false, $:false, CryptoJS:false, OAuth:false */
/*jshint camelcase:false */

/*
 *  Feed Media Session API
 *
 *  This manages all communication with the server and is the single point
 *  of truth for a client to manage what is actively being played. It
 *  should be created with:
 *
 *  var session = new Feed.Session(token, secret);
 *
 *  Then you need to set a placement and optionally a station:
 *
 *  session.setPlacementId(placementId);
 *  session.setStationId(stationId);
 *  session.setFormats(formats); // "mp3", "aac", "mp3,aac"
 *
 *  If any of the above calls are made while we're actively tuning (we've
 *  got an active song or a pending song), then any currently active song
 *  will be marked as 'completed' and a new song will be requested from
 *  the server.
 *
 *  Then you attach event listeners to the session:
 *
 *  session.on('play-active', someHandler);
 *
 *  Then you optionally ask the server for information about the station we're
 *  tuning to:
 *
 *  session.getStationInformation(function(stationInfo) { console.log(stationInfo); });
 *
 *  Then you tell the session to start maintaining a queue of 
 *  music to play:
 *
 *  session.tune();
 *
 *  The session will now emit the following events:
 *
 *  play-active: when the session has a play ready for playback
 *  play-started: when the active play has started playback (as
 *    a result of a call to reportPlayStarted)
 *  play-completed: when the session has successfully told the server
 *    that the current play has completed, been skipped (after a 
 *    call to reportPlayCompleted), or been invalidated
 *  skip-denied: when the session has been told by the server that the
 *    skip cannot be performed (after a call to requestSkip)
 *  plays-exhausted: when the server can find no more music in the
 *    current station that satisfies DMCA constraints (this will
 *    be either the first event after a 'tune' call, or after a
 *    play-completed event). The client must make another call to
 *    tune() to begin pulling in more music.
 *
 *  Clients that use the session object should tell the session about
 *  the status of the current play as it progresses:
 *
 *  session.reportPlayStarted(): tell the server we have begun playback of the
 *    current song to the end user.
 *  session.reportPlayElapsed(seconds): tell the server how many elapsed seconds
 *    of the song have been played since it started.
 *  session.reportPlayCompleted(): tell the server that we have completed 
 *    playing the current song. This will cause the session object
 *    to emit a 'play-completed' event followed by a 'play-active' when
 *    the next song is ready for playback
 *
 *  session.requestSkip(): ask the server if we can skip playback of the current
 *    song. If the skip is denied, a 'skip-denied' event will be triggered,
 *    otherwise a 'play-completed' will be triggered.
 *  session.requestInvalidate(): tell the server that we're unable to play the
 *    current song for some reason, and the server should stop playback
 *    of the song (if started) and give us a new song. The session will
 *    trigger a 'play-completed' event after this call.
 *
 *  Data held by the session can be retrieved with:
 *
 *  session.getActivePlay(): returns the currently active play, if any, or null
 *  session.isTuned(): true if the session has active plays available or is awaiting
 *    plays from the server
 *  session.hasActivePlayStarted(): returns true if the active play is playing now
 *  session.maybeCanSkip(): returns true if there is a song being played now and 
 *    we believe we can skip it (this might not hold true, and the server can
 *    override this)
 */

(function() {
  var log = window.Feed.log;

  // use SHA256 for encryption
  OAuth.SignatureMethod.registerMethodClass(['HMAC-SHA256', 'HMAC-SHA256-Accessor'],
    OAuth.SignatureMethod.makeSubclass(
      function getSignature(baseString) {
        var hash = CryptoJS.HmacSHA256(baseString, this.key);
        var signature = hash.toString(CryptoJS.enc.Base64);
        return signature;
      }
    ));

  var Session = function(token, secret) {
    this.config = {
      // token
      // secret
      // placementId
      // stationId
      // clientId
      baseUrl: 'http://feed.fm',
      formats: 'mp3,aac',
      maxBitrate: 128,
      timeOffset: 0,
      current: null, /* {
                          play:  play object we're currently playing
                          started: defaults to false
                          canSkip: defaults to false
                         }, */
      pendingRequest: null, /* {
                                 ajax:       form data we sent to request a play
                                 retryCount: number of times we've retried 
                               }, */
      
      pendingPlay: null // play object we'll start upon completion of current
                        //   sound 
    };

    _.extend(this, window.Feed.Events);

    if (token && secret) {
      this.setCredentials(token, secret);
    }
  };

  Session.prototype.setBaseUrl = function(baseUrl) {
    this.config.baseUrl = baseUrl;
  };

  Session.prototype.setCredentials = function(token, secret) {
    this.config.token = token;
    this.config.secret = secret;
  };

  Session.prototype._synchronizeClock = function() {
    var self = this;

    this._ajax({
      url: this.config.baseUrl + '/api/v2/oauth/time',
      type: 'GET'
    }).then(function(response) {
      if (response && response.success) {
        var serverTime = response.result,
            localTime = (Date.now() / 1000);

        self.config.timeSkew = serverTime - localTime;
      }

    }).fail(function() {
      log('clock synchronization failed');
    });
  };

  Session.prototype.setPlacementId = function(placementId) {
    this.config.placementId = placementId;
    this.trigger('placement-changed', placementId);

    this._retune();
  };

  Session.prototype.setStationId = function(stationId) {
    this.config.stationId = stationId;
    this.trigger('station-changed', stationId);

    this._retune();
  };

  Session.prototype.setFormats = function(formats) {
    this.config.formats = formats;

    this._retune();
  };

  Session.prototype.setMaxBitrate = function(maxBitrate) {
    this.config.maxBitrate = maxBitrate;
  };

  // tune
  Session.prototype.tune = function() {
    if (!this.config.token) {
      throw new Error('no token set with setCredentials()');
    }

    if (!this.config.secret) {
      throw new Error('no secret set with setCredentials()');
    }

    if (!this.config.placementId) {
      throw new Error('no placementId set');
    }

    // abort any pending requests or plays
    this.config.pendingRequest = null;
    this.config.pendingPlay = null;

    // stop playback of any current song, and set
    // the status to waiting
    this._assignCurrentPlay(null, true);

    // kick off request for next play
    this._requestNextPlay();
  };

  // getStationInformation
  Session.prototype.getStationInformation = function(stationInformationCallback, delay) {
    var self = this;

    if (!this.config.placementId) {
      throw new Error('no placementId set');
    }

    this._getClientId().then(function() {
      var ajax = { 
        url: self.config.baseUrl + '/api/v2/placement/' + self.config.placementId + '/station',
        type: 'GET',
        dataType: 'json',
        timeout: 6000,
        data: {
          client_id: self.config.clientId
        }
      };

      if (self.config.stationId) {
        ajax.data.station_id = self.config.stationId;
      }

      // request new play from server
      log('requesting station information from server');
      self._signedAjax(ajax)
        .done(_.bind(self._receiveStationInformation, self, stationInformationCallback))
        .fail(_.bind(self._failedStationInformation, self, delay, ajax, stationInformationCallback));
    });
  };

  Session.prototype._receiveStationInformation = function(stationInformationCallback, stationInformation) {
    if (stationInformation && stationInformation.success && (stationInformation.stations.length > 0)) {
      stationInformationCallback(stationInformation.stations[0]);
    }
  };

  Session.prototype._failedStationInformation = function(delay, ajax, stationInformationCallback) {
    delay = delay ? (delay * 2) : 500;
    _.delay(_.bind(this.getStationInformation, this, stationInformationCallback, delay), delay);
  };

  Session.prototype.getActivePlay = function() { 
    if (this.config.current) {
      return this.config.current.play;
    } else {
      return null;
    }
  };

  Session.prototype.isTuned = function() {
    return this.config.current || this.config.pendingRequest;
  };

  Session.prototype.hasActivePlayStarted = function() {
    return this.config.current && this.config.current.started;
  };

  // re-tune
  Session.prototype._retune = function() {
    // if we're not actively playing anything, nothing needs to be sent
    if (!this.isTuned()) {
      return;
    }

    this.tune();
  };

  Session.prototype.reportPlayStarted = function() {
    if (!this.config.current) {
      throw new Error('attempt to report a play started, but there is no active play');
    }

    this._startPlay(this.config.current.play);
  };

  Session.prototype.reportPlayElapsed = function(seconds) {
    if (!this.config.current) {
      throw new Error('attempt to report elapsed play time, but the play hasn\'t started');
    }

    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + 'elapse', 
      type: 'POST',
      data: {
        seconds: seconds
      }
    });
  };

  Session.prototype.reportPlayCompleted = function() {
    if (this.config.current && (this.config.current.started)) {
      this._signedAjax({
        url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/complete',
        type: 'POST'
      });

      if (!this.config.pendingRequest) {
        log('song finished, and no outstanding request, so playing pendingPlay');
        // if we're not waiting for an incoming request, then we must
        // have the next play queued up, so play it:
        var pendingPlay = this.config.pendingPlay;
        this.config.pendingPlay = null;

        this._assignCurrentPlay(pendingPlay);

      } else {
        log('song finished, but we\'re still waiting for next one to return');

        // we're waiting for a request to come in, so kill the current
        // song and announce that we're waiting
        this._assignCurrentPlay(null, true);
      }

    } else {
      log('finish on non-active or playing song');
      throw new Error('no active or playing song');
    }
  };

  Session.prototype.requestSkip = function() {
    if (!this.config.current) {
      throw new Error('No song being played');
    }

    if (!this.config.current.started) {
      throw new Error('No song has been started');
    }

    if (!this.config.current.canSkip) {
      this.trigger('skip-denied');
      return;
    }

    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/skip',
      type: 'POST'
    })
      .done(_.bind(this._receiveSkip, this, this.config.current.play))
      .fail(_.bind(this._failSkip, this, this.config.current.play));
  };

  Session.prototype.requestInvalidate = function() {
    if (!this.config.current) {
      throw new Error('No active song to invalidate!');
    }

    this._sendInvalidate(this.config.current.play);
  };

  Session.prototype._sendInvalidate = function(play, delay) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + play.id + '/invalidate',
      type: 'POST'
    })
      .done(_.bind(this._receiveInvalidate, this, play))
      .fail(_.bind(this._failInvalidate, this, delay, play));
  };

  Session.prototype._failInvalidate = function(delay, play, response) {
    var self = this;

    delay = (delay ? delay * 2 : 200);

    if (delay < 3000) {
      _.delay(function() {
        self._sendInvalidate(play);
      }, delay);

    } else {
      log('gave up trying to invalidate play', response);

    }
  };

  Session.prototype._receiveInvalidate = function(play, response) {
    if (this.config.current && (this.config.current.play !== play)) {
      // not holding this song any more - just ignore it
      return;
    }

    if (!response.success) {
      log('failed invalidate! - technically this is impossible');
      return;
    }

    if (this.config.pendingPlay) {
      log('invalidating to song already queued up');
      // skip to play already queued up
      var pendingPlay = this.config.pendingPlay;
      this.config.pendingPlay = null;
      this._assignCurrentPlay(pendingPlay);

    } else {
      log('invalidating current song');
      this._assignCurrentPlay(null, true);
    
      if (!this.config.pendingRequest) {
        log('queueing up new song');
        this._requestNextPlay();

      }
    }
  };

  Session.prototype._failSkip = function(play) {
    if (this.config.current && (this.config.current.play !== play)) {
      // not playing this song any more - just ignore it
      return;
    }
    // technically the skip wasn't denied - we just couldn't confirm wether
    // it was ok, but this is the best we can return at the moment
    this.trigger('skip-denied');
  };

  Session.prototype._receiveSkip = function(play, response) {
    if (this.config.current && (this.config.current.play !== play)) {
      // not playing this song any more - just ignore it
      return;
    }

    if (!response.success) {
      log('failed skip!');
      this.trigger('skip-denied');
      return;
    }

    if (this.config.pendingPlay) {
      log('skipping to song already queued up');
      // skip to play already queued up
      var pendingPlay = this.config.pendingPlay;
      this.config.pendingPlay = null;
      this._assignCurrentPlay(pendingPlay);

    } else if (this.config.pendingRequest) {
      log('skipping to what is queued up');
      // we're waiting for a request - so just wait for that to show up
      this._assignCurrentPlay(null, true);

    } else {
      log('skipping to what is queued up');
      // nothing queued up and nothing being requested - we're outta music!
      this._assignCurrentPlay(null);

    }
  };

  Session.prototype._startPlay = function(play) {
    if (this.config.current.retryCount > 2) {
      // fuck it - let the user hear the song
      this._receiveStartPlay(play, false);

    } else {
      log('telling server we\'re starting the play', play);

      // tell the server that we're going to start this song
      this._signedAjax({
        url: this.config.baseUrl + '/api/v2/play/' + play.id + '/start',
        type: 'POST',
        dataType: 'json',
        timeout: 3000,
        data: { id: play.id }
      })
        .done(_.bind(this._receiveStartPlay, this, play))
        .fail(_.bind(this._failStartPlay, this, play));
    }
  };

  Session.prototype._receiveStartPlay = function(play, response) {
    if (response.success) {

      if (this.config.current && (this.config.current.play === play)) {
        this.config.current.canSkip = response.can_skip;
        this.config.current.started = true;

        this.trigger('play-started', play);

        // since we're ok to start this song, we can start looking for the
        // next song
        this._requestNextPlay();

      } else {
        log('received start play, but not waiting any more');
      }

    } else {
      log('received failed start success');
    }
  };

  Session.prototype._failStartPlay = function(play) {
    // only process if we're still actually waiting for this
    if (this.config.current && (this.config.current.play === play)) {
      log('request failed - trying again in 1 second');

      this.config.current.retryCount++;

      // wait a second and try again
      _.delay(_.bind(this._startPlay, this, play), 1000);

    } else {
      log('startPlay failed, but we don\'t care any more');
    }
  };

  // start playing the given song
  Session.prototype._assignCurrentPlay = function(play, waitingIfEmpty) {
    // remove any existing play
    if (this.config.current) {
      this.trigger('play-completed', this.config.current.play);
      this.config.current = null;
    }
    if (play === null) {
      // nothing to play right now

      if (waitingIfEmpty) {
        //this.config.status = 'waiting';
        log('nothing to play... waiting');

      } else {
        //this.config.status = 'idle';
        log('nothing to play from the current station');
        this.trigger('plays-exhausted');
      }

    } else {
      // we're starting this song, so note that
      this.config.current = {
        play: play,
        canSkip: false,
        started: false,
        retryCount: 0
      };

      //this.config.status = 'active';

      log('activated new song');
      this.trigger('play-active', play);

    }
  };

  Session.prototype._requestNextPlay = function(delay) {
    if (this.config.pendingRequest) {
      if (this.config.pendingRequest.inprogress) {
        log('tried to get another play while we\'re loading one up');

        // request is currently in progress
        return;
      
      } else if (delay > 60000) {
        log('giving up on retrieving next play');

        // we already retried this - let's give up
        this.config.pendingRequest = null;

        if (this.config.current == null) {
          // we're not playing anything, so we're waiting. 
          // set assign play to null again to trigger empty/idle
          this._assignCurrentPlay(null);
        }
        return;

      } else {
        // retry the request
        this.config.pendingRequest.retryCount++;

        this._signedAjax(this.config.pendingRequest.ajax)
          .done(_.bind(this._receiveNextPlay, this, this.config.pendingRequest.ajax))
          .fail(_.bind(this._failedNextPlay, this, delay, this.config.pendingRequest.ajax));
        return;
      }
      
    } else {
      var self = this;

      self.config.pendingRequest = {
        inprogress: true
      };

      this._getClientId().then(function() {
        if (!self.config.pendingRequest || !self.config.pendingRequest.inprogress) {
          // don't get a new song if we've aborted things
          return;
        }
        
        var ajax = { 
          url: self.config.baseUrl + '/api/v2/play',
          type: 'POST',
          dataType: 'json',
          timeout: 6000,
          data: {
            placement_id: self.config.placementId,
            formats: self.config.formats,
            client_id: self.config.clientId,
            max_bitrate: self.config.maxBitrate
          }
        };

        if (self.config.stationId) {
          ajax.data.station_id = self.config.stationId;
        }

        self.config.pendingRequest = {
          ajax: ajax,
          retryCount: 0
        };

        // request new play from server
        log('requesting new play from server');
        self._signedAjax(ajax)
          .done(_.bind(self._receiveNextPlay, self, ajax))
          .fail(_.bind(self._failedNextPlay, self, delay, ajax));
      });
    }
  };

  // we received a song to play from the server
  Session.prototype._receiveNextPlay = function(ajax, response) {
    // only process if we're still actually waiting for this
    if (this.config.pendingRequest && (this.config.pendingRequest.ajax === ajax)) {
      // this isn't pending any more
      this.config.pendingRequest = null;

      if (response.success) {
        if (this.config.current) {
          log('received play, but we\'re already playing, so queueing up', response.play);

          // play this when the current song is complete
          this.config.pendingPlay = response.play;

        } else {
          log('received play and no current song, so playing now', response.play);

          // start playing this right now, since nothing else is playing
          this._assignCurrentPlay(response.play);

        }

      } else if (response.error && response.error.code === 9) {
        if (this.config.current) {
          log('ran out of music to play, but we\'re already playing');

          this.config.pendingPlay = null;

        } else {
          log('ran out of music, and nothing playing now');

          this.trigger('plays-exhausted');
        }

      } else {
        log('unsuccessful response', response);
      }

    } else {
      log('nextPlay succeeded, but we don\'t care');
    }
  };

  // server returned an error when we requested the next song
  Session.prototype._failedNextPlay = function(delay, ajax) {
    // only process if we're still actually waiting for this
    if (this.config.pendingRequest && (this.config.pendingRequest.ajax === ajax)) {
      log('request failed - trying again');

      delay = delay ? (delay * 2) : 500;
      _.delay(_.bind(this._requestNextPlay, this, delay), delay);

    } else {
      log('nextPlay failed, but we don\'t care');
    }
  };

  Session.prototype._synchronizeServerTime = function() {
    if (this.timePromise) {
      return this.timePromise;
    }

    var timeDeferred = $.Deferred();
    this.timePromise = timeDeferred.promise();

    var self = this;
    timeDeferred.then(function(serverTime) {
      var localTime = self._unixTime();

      self.config.timeOffset = serverTime - localTime;
    });

    this._requestServerTime(timeDeferred);

    return this.timePromise;
  };

  // hit the server up for the time and return via the passed-in Deferred object
  Session.prototype._requestServerTime = function(deferred, delay) {
    var self = this;

    this._ajax({
      url: self.config.baseUrl + '/api/v2/oauth/time',
      type: 'GET'

    }).done(function(response) {
      if (response.success) {
        deferred.resolve(response.time);

      } else {
        repeatAfter(delay, 2000, function(newDelay) { 
          self._requestServerTime(deferred, newDelay);
        });
      }

    }).fail(function() {
      repeatAfter(delay, 2000, function(newDelay) { 
        self._requestServerTime(deferred, newDelay);
      });
    });
  };

  Session.prototype._getClientId = function() {
    if (this.clientPromise) {
      return this.clientPromise;
    }
    var clientDeferred = new $.Deferred();
    this.clientPromise = clientDeferred.promise();

    var self = this;
    this.clientPromise.then(function(clientId) {
      // once we've got a clientId, stick it in the config
      self.config.clientId = clientId;

      self._setStoredCid(self.config.clientId);
    });

    this._requestClientId(clientDeferred);

    return this.clientPromise;
  };

  // hit the server up for a client id and return it via the passed in deferred
  Session.prototype._requestClientId = function(deferred, delay) {
    // see if we've got a cookie
    var clientId = this._getStoredCid();

    if (clientId) {
      return deferred.resolve(clientId);

    } else {
      var self = this;

      this._signedAjax({
        url: self.config.baseUrl + '/api/v2/client',
        type: 'POST'

      }).done(function(response) {
        if (response.success) {
          deferred.resolve(response.client_id);

        } else {
          repeatAfter(delay, 2000, function(newDelay) { 
            // retry until the end of time
            self._requestClientId(deferred, newDelay);
          });
        }

      }).fail(function() {
        repeatAfter(delay, 2000, function(newDelay) { 
          // retry until the end of time
          self._requestClientId(deferred, newDelay);
        });
      });
    }
  };

  function repeatAfter(delay, max, cb) {
    delay = delay ? (2 * delay) : 200;

    if (delay > max) {
      delay = max;
    }

    setTimeout(function() {
      cb(delay);
    }, delay);

  }

  Session.prototype.maybeCanSkip = function() {
    return this.config.current && this.config.current.started && this.config.current.canSkip;
  };

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  var cookieName = 'cid';
  Session.prototype._getStoredCid = function() {
    if (supports_html5_storage()) {
      return localStorage[cookieName];
    } else {
      return $.cookie(cookieName);
    }
  };

  Session.prototype._setStoredCid = function(value) {
    if (supports_html5_storage()) {
      localStorage[cookieName] = value;
    } else {
      $.cookie(cookieName, value, { expires: 3650, path: '/' });
    }
  };

  Session.prototype._deleteStoredCid = function() {
    if (supports_html5_storage()) {
      localStorage.removeItem(cookieName);
    } else {
      $.removeCookie(cookieName, { path: '/' });
    }
  };

  Session.prototype._unixTime = function() {
    return Math.floor( Date.now() / 1000 );
  };

  Session.prototype._makeNonce = function() {
    return Math.random().toString(36).substring(8);
  };

  Session.prototype._sign = function(request) {
    // sign the form if oauth is requested
    var message = {
      action: request.url,
      method: request.type,
      parameters: {
        oauth_timestamp: this._unixTime() + this.config.timeOffset,
        oauth_nonce: this._makeNonce(), 
        oauth_signature_method: 'HMAC-SHA256'
      }
    };

    $.extend(message.parameters, request.data);

    OAuth.completeRequest(message, {
      consumerKey:    this.config.token,
      consumerSecret: this.config.secret
    });

    request.headers = {
      Authorization: OAuth.getAuthorizationHeader('Feed.fm', message.parameters)
    };

    return request;
  };

  Session.prototype._signedAjax = function(request) {
    var self = this,
        deferred = $.Deferred();

    // synch the clock before signing anything
    this._synchronizeServerTime()
      .then(function() {
        self._ajax(self._sign(request))
          .then(function(response) { deferred.resolve(response); })
          .fail(function(err) { deferred.reject(err); });
      });

    return deferred;
  };

  Session.prototype._ajax = function(request) {
    return $.ajax(request);
  };

  window.Feed = window.Feed || {};
  window.Feed.Session = Session;

})();

