/*global define:false */
/*jshint camelcase:false */

/*
 *  Feed Media Session API
 *
 *  This manages all communication with the server and is the single point
 *  of truth for a client to manage what is actively being played. It
 *  should be created with:
 *
 *  var session = new Feed.Session(token, secret[, options]);
 *
 *  Then you attach event listeners to the session:
 *
 *  session.on('play-active', someHandler);
 *
 *  Then you can optionally set a placement and a station:
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
 *  Then you tell the session to start maintaining a queue of 
 *  music to play:
 *
 *  session.tune();
 *
 *  The session will now emit the following events:
 *
 *  not-in-us: if feed can't determine that the user is in the US, then
 *    the user won't be allowed to play any music. This check is made
 *    every time we try to retrieve a song. Once you get this event, you
 *    should assume nothing further will work.
 *  placement: after we tune in to a placement or station,
 *    this passes on information about the placement we
 *    tuned in to.
 *  stations: after tuning to a specific placement, the server returns a
 *    list of available stations. This is that list.
 *  station-changed: emitted after a 'setStation' call, and passed the
 *    ID of the station
 *  placement-changed: emitted after a 'setPlacement' call, and passed the
 *    ID of the placement
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
 *
 *  Other misc calls:
 *  
 *  session.likePlay(), session.unlikePlay(), session.dislikePlay(): like handling
 *
 *  The optional 'options' argument passed to the constructor can have the following
 *  attributes:
 *
 *    secure: if true, the default URLs for accessing the feed API will be
 *       over 'https' rather than 'http' (the default).
 *    baseUrl: defines the base host that responds to API calls - defaults
 *       to '//feed.fm'. Really only used with local testing.
 */

define([ 'underscore', 'jquery', 'CryptoJS', 'OAuth', 'feed/log', 'feed/events', 'feed/util', 'jquery.cookie', 'enc-base64' ], function(_, $, CryptoJS, OAuth, log, Events, util) {

  // use SHA256 for encryption
  OAuth.SignatureMethod.registerMethodClass(['HMAC-SHA256', 'HMAC-SHA256-Accessor'],
    OAuth.SignatureMethod.makeSubclass(
      function getSignature(baseString) {
        var hash = CryptoJS.HmacSHA256(baseString, this.key);
        var signature = hash.toString(CryptoJS.enc.Base64);
        return signature;
      }
    ));

  var Session = function(token, secret, options) {
    options = options || { };

    this.config = {
      // token
      // secret
      // placementId
      // placement
      // stationId
      // stations
      // clientId
      baseUrl: util.addProtocol(options.baseUrl || '//feed.fm', options.secure),
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

    _.extend(this, Events);

    if (token && secret) {
      this.setCredentials(token, secret);
    }
  };

  Session.prototype.setBaseUrl = function(baseUrl) {
    this.config.baseUrl = util.addProtocol(baseUrl);
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

    // abort any pending requests or plays
    this.config.pendingRequest = null;
    this.config.pendingPlay = null;

    // stop playback of any current song, and set
    // the status to waiting
    this._assignCurrentPlay(null, true);

    // pull information in about the placement, followed by
    // a request for the next play
    if (!this.config.placementId) {
      this._getDefaultPlacementInformation();
    } else {
      this._getPlacementInformation();
    }
  };

  // _getDefaultPlacementInformation
  Session.prototype._getDefaultPlacementInformation = function(delay) {
    var self = this;

    if (this.config.placementId && this.config.placement && (this.config.placement.id === this.config.placementId)) {
      // already have placement info
      return;
    }

    var ajax = { 
      url: self.config.baseUrl + '/api/v2/placement',
      type: 'GET',
      dataType: 'json',
      timeout: 6000
    };

    // request placement info from server
    log('requesting default placement information from server');
    self._signedAjax(ajax)
      .done(_.bind(self._receiveDefaultPlacementInformation, self))
      .fail(_.bind(self._failedDefaultPlacementInformation, self, delay, ajax));
  };

  Session.prototype._receiveDefaultPlacementInformation = function(placementInformation) {
    if (placementInformation && placementInformation.success && placementInformation.placement) {
      this.config.placement = placementInformation.placement;
      this.config.stations = placementInformation.stations;

      this.config.placementId = placementInformation.placement.id;
      this.trigger('placement-changed', this.config.placementId);

      this.trigger('placement', placementInformation.placement);

      if (!('stationId' in this.config) && (placementInformation.stations.length > 0)) {
        this.config.stationId = placementInformation.stations[0].id;
        this.trigger('station-changed', this.config.stationId);
      }

      this.trigger('stations', placementInformation.stations);

      // kick off request for next play
      this._requestNextPlay();
    }
  };

  Session.prototype._failedDefaultPlacementInformation = function(delay) {
    delay = delay ? (delay * 2) : 500;
    _.delay(_.bind(this._getDefaultPlacementInformation, this, delay), delay);
  };

  // _getPlacementInformation
  Session.prototype._getPlacementInformation = function(delay) {
    var self = this;

    if (!this.config.placementId) {
      throw new Error('no placementId set');
    }

    if (this.config.placement && (this.config.placement.id === this.config.placementId)) {
      // already have placement info
      return;
    }

    var ajax = { 
      url: self.config.baseUrl + '/api/v2/placement/' + self.config.placementId,
      type: 'GET',
      dataType: 'json',
      timeout: 6000
    };

    // request placement info from server
    log('requesting placement information from server');
    self._signedAjax(ajax)
      .done(_.bind(self._receivePlacementInformation, self))
      .fail(_.bind(self._failedPlacementInformation, self, delay, ajax));
  };

  Session.prototype._receivePlacementInformation = function(placementInformation) {
    if (placementInformation && placementInformation.success && placementInformation.placement) {
      this.config.placement = placementInformation.placement;
      this.config.stations = placementInformation.stations;

      this.trigger('placement', placementInformation.placement);

      if (!('stationId' in this.config) && (placementInformation.stations.length > 0)) {
        this.config.stationId = placementInformation.stations[0].id;
        this.trigger('station-changed', this.config.stationId);
      }

      this.trigger('stations', placementInformation.stations);

      // kick off request for next play
      this._requestNextPlay();
    }
  };

  Session.prototype._failedPlacementInformation = function(delay) {
    delay = delay ? (delay * 2) : 500;
    _.delay(_.bind(this._getPlacementInformation, this, delay), delay);
  };

  Session.prototype.getActivePlacement = function() {
    if (this.config.placement) {
      return this.config.placement;
    } else {
      return null;
    }
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
      url: this.config.baseUrl + '/api/v2/play/' + this.config.current.play.id + '/elapse', 
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
      this._receiveStartPlay(play, { success: true, can_skip: true });

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
            formats: self.config.formats,
            client_id: self.config.clientId,
            max_bitrate: self.config.maxBitrate
          }
        };

        if (self.config.placementId) {
          ajax.data.placement_id = self.config.placementId;
        }

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
  Session.prototype._failedNextPlay = function(delay, ajax, response) {
    // only process if we're still actually waiting for this
    if (this.config.pendingRequest && (this.config.pendingRequest.ajax === ajax)) {

      if (response.status === 403) {
        try {
          var fullResponse = $.parseJSON(response.responseText);

          if (fullResponse.error && fullResponse.error.code === 19) {
            // user isn't in the US any more, so let the call fail
            this.trigger('not-in-us');
            return;
          }
        } catch (e) {
          // some other response - fall through and try again
        }
      }

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

    this._requestClientId(function(clientId) {
      // once we've got a clientId, stick it in the config
      self.config.clientId = clientId;

      self._setStoredCid(self.config.clientId);

      clientDeferred.resolve(clientId);
    });

    return this.clientPromise;
  };

  // hit the server up for a client id and return it via the passed in deferred
  Session.prototype._requestClientId = function(saveClientId, delay) {
    // see if we've got a cookie
    var clientId = this._getStoredCid();

    if (clientId) {
      return saveClientId(clientId);

    } else {
      var self = this;

      this._signedAjax({
        url: self.config.baseUrl + '/api/v2/client',
        type: 'POST'

      }).done(function(response) {
        if (response.success) {
          saveClientId(response.client_id);

        } else {
          repeatAfter(delay, 2000, function(newDelay) { 
            // retry until the end of time
            self._requestClientId(saveClientId, newDelay);
          });
        }

      }).fail(function(response) {
        if (response.status === 403) {
          try {
            var fullResponse = $.parseJSON(response.responseText);

            if (fullResponse.error && fullResponse.error.code === 19) {
              // user isn't in the US any more, so let the call fail
              self.trigger('not-in-us');
              return;
            }
          } catch (e) {
            // some other response - fall through and try again
          }
        }

        repeatAfter(delay, 2000, function(newDelay) { 
          // retry until the end of time
          self._requestClientId(saveClientId, newDelay);
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

  Session.prototype.likePlay = function(playId) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + playId + '/like',
      type: 'POST'
    });

    if (this.config.current && (this.config.current.play.id === playId)) {
      this.config.current.play.liked = true;
    }
  };

  Session.prototype.unlikePlay = function(playId) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + playId + '/like',
      type: 'DELETE'
    });

    if (this.config.current && (this.config.current.play.id === playId)) {
      delete this.config.current.play['liked'];
    }
  };

  Session.prototype.dislikePlay = function(playId) {
    this._signedAjax({
      url: this.config.baseUrl + '/api/v2/play/' + playId + '/dislike',
      type: 'POST'
    });

    if (this.config.current && (this.config.current.play.id === playId)) {
      this.config.current.play.liked = false;
    }
  };

  /*
   * Save the current state of the session, so we can recreate
   * our current state in the future. The object returned
   * is what should be passed to 'unsuspend'. The 'startPosition'
   * should be the current playback offset for the active play, 
   * in milliseconds.
   */

  Session.prototype.suspend = function(startPosition) {
    var saved = { };

    if (this.config.placementId) {
      saved.placementId = this.config.placementId;
    }

    if (this.config.stationId) {
      saved.stationId = this.config.stationId;
    }

    if (this.config.current && this.config.current.started) {
      // only save the active play if we've actually started
      // playing it (otherwise the next call to create a play
      // will return the same data)
      saved.placement = this.config.placement;
      saved.stations = this.config.stations;
      saved.play = _.clone(this.config.current.play);
      saved.play.startPosition = startPosition;
      saved.canSkip = this.config.current.canSkip;
    }

    return saved;
  };

  /*
   * Use the saved session passed in to restore the player to
   * the state it was in previously. This method will make sure
   * all the necessary events are triggered so that any
   * object observing events from this session will believe a
   * 'session.tune()' call was made.
   */

  Session.prototype.unsuspend = function(saved) {
    if (this.getActivePlay()) {
      throw new Error('You cannot unsuspend after running tune()');
    }

    if ('placementId' in saved) {
      this.config.placementId = saved.placementId;
      this.trigger('placement-changed', this.config.placementId);
    }

    if ('stationId' in saved) {
      this.config.stationId = saved.stationId;
      this.trigger('station-changed', this.config.stationId);
    }

    if ('play' in saved) {
      this.config.placement = saved.placement;
      this.config.stations = saved.stations;

      this.trigger('placement', this.config.placement);
      this.trigger('stations', this.config.stations);

      // emit the 'play-active' event
      this._assignCurrentPlay(saved.play);

      // make a fake start response from the server, emit
      // a 'play-start' event, and then start queueing
      // up the next song to play
      this._receiveStartPlay(saved.play, { success: true, can_skip: saved.canSkip });

      return saved.play;

    } else {
      this.tune();

      return null;
    }
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
    var authorization;

    if (request.url.slice(0, 5) === 'https') {
      // use Basic auth for HTTPS
      authorization = 'Basic ' + CryptoJS.enc.Base64.stringify(
                        CryptoJS.enc.Latin1.parse(
                          this.config.token + ':' + this.config.secret
                        )
                      );

    } else {
      // use OAuth for HTTP

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

      authorization = OAuth.getAuthorizationHeader('Feed.fm', message.parameters);
    }

    request.headers = {
      Authorization: authorization
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

  return Session;

});

