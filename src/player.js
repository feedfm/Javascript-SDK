/*global define:false */
/*jshint camelcase:false */

/*
 *  Feed Media Player
 *
 *  This class requests and plays audio files from the feed servers. It
 *  makes use of the Session class to communicate with the server. There
 *  should technically only ever be one instance of this class in a page.
 *  This class does no UI - that should be handled by Feed.PlayerView 
 *  or similar.
 *
 *  Create this with:
 *    player = new Feed.Player(token, secret[, options])
 *
 *  (where 'options' is an optional object that is passed to the
 *   feed/speaker function and the feed/session constructor. Normally
 *   you'd only use a value of '{ secure: true }' to use HTTPS for all
 *   communications)
 *
 *  Then set the optional placement and station that we're pulling
 *  from:
 *
 *    player.setPlacementId(xxx);
 *      set placement on session, which should stop any current plays
 *    player.setStationId(xxx);
 *      set station on session, which should stop any current plays
 *
 *  Then control playback with:
 *
 *    tune() - load up information about the current placement, but
 *      don't actually start playing it.
 *    play() - start playing the current placement/station or resume the current song
 *    pause() - pause playback of the current song, if any
 *    like() - tell the server we like this song
 *    unlike() - tell the server to remove the 'like' for this song
 *    dislike() - tell the server we dislike this song, and skip to the next one
 *    skip() - request to skip the current song
 *
 *  player has a current state that can be queried with 'getCurrentState()':
 *    playing - if session.hasActivePlayStarted() and we're not paused
 *    paused -  if session.hasActivePlayStarted() and we're paused
 *    idle - if !session.hasActivePlayStarted()
 *    suspended - if player.suspend() has been called (ie - the player has
 *      been popped out into a new window)
 *
 *  session events are proxied via the play object:
 *    not-in-us - user isn't located in the US and can't play music
 *    placement - information about the placement we just tuned to
 *    play-active - this play is queued up and ready for playback
 *    play-started - this play has begun playback
 *    play-completed  - this play has completed playback
 *    plays-exhausted - there are no more plays available from this placement/station combo
 *    skip-denied - the given song could not be skipped due to DMCA rules
 *  
 *  and the play object adds some new events:
 *    play-paused - the currently playing song was paused
 *    play-resumed - the currently playing song was resumed
 *    play-liked - the currently playing song was liked
 *    play-unliked - the currently playing song had it's 'like' status removed
 *    play-disliked - the currently playing song was disliked
 *    suspend - player.suspend() was called, and the player should stop playback
 *
 *  Some misc methods:
 *
 *    setMuted(muted)
 *    suspend - this returns the state of the player a an object that can be passed
 *      to the unsuspend() call.
 *    unsuspend(state, [startPlay]) - this call takes the state of a previously suspended player
 *      instance and makes this player match that one. These calls allow you to suspend
 *      the player, open up a new window, create a new player instance, and resume playback
 *      where you left off. This call should be made in place of a tune() or play() call.
 *
 */

define([ 'underscore', 'jquery', 'feed/log', 'feed/speaker', 'feed/events', 'feed/session' ], function(_, $, log, getSpeaker, Events, Session) {

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  var Player = function(token, secret, options) {
    this.state = {
      paused: true,
      suspended: false
      // activePlay
    };

    options = options || {};

    _.extend(this, Events);

    var session = this.session = new Session(token, secret, options);
    this.session.on('play-active', this._onPlayActive, this);
    this.session.on('play-started', this._onPlayStarted, this);
    this.session.on('play-completed', this._onPlayCompleted, this);
    this.session.on('plays-exhausted', this._onPlaysExhausted, this);

    this.session.on('all', function() {
      // propagate all events out to everybody else
      this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
    }, this);

    // create 'speakerInitialized' promise so we can delay things until
    // the audio subsystem is set up.
    var initializeSpeaker = this.initializeSpeaker = $.Deferred();

    this.speaker = getSpeaker(options, function(formats) {
      if (options.formats) {
        session.setFormats(options.formats);
      } else {
        session.setFormats(formats);
      }
      initializeSpeaker.resolve();
    });

    this.setMuted(this.isMuted());
  };

  Player.prototype.setPlacementId = function(placementId) {
    this.session.setPlacementId(placementId);
  };

  Player.prototype.setStationId = function(stationId) {
    this.session.setStationId(stationId);
  };

  Player.prototype.setBaseUrl = function(baseUrl) {
    this.session.setBaseUrl(baseUrl);
  };

  Player.prototype._onPlayActive = function(play) {
    // create a new sound object
    var options = {
      play: _.bind(this._onSoundPlay, this, play.id),
      pause: _.bind(this._onSoundPause, this, play.id),
      finish:  _.bind(this._onSoundFinish, this, play.id),
      elapse: _.bind(this._onSoundElapse, this, play.id)
    };

    if (play.startPosition) {
      options.startPosition = play.startPosition;
    }

    var sound = this.speaker.create(play.audio_file.url, options);

    this.state.activePlay = {
      id: play.id,
      sound: sound,
      startReportedToServer: false, // wether we got a 'play-started' event from session
      soundCompleted: false,        // wether the sound object told us it finished playback
      playStarted: false,           // wether playback started on the sound object yet
      previousPosition: 0           // last time we got an 'elapse' callback
    };
    log('created new active play', this.state.activePlay);

    // if we're not paused, then start it
    if (!this.state.paused) {
      var s = this.state.activePlay.sound;
      // flash freaks if you do this in the finish handler for a sound, so
      // schedule it for the next event loop
      setTimeout(function() {
        s.play();
      }, 1);
    }
  };

  Player.prototype._onSoundPlay = function(playId) {
    // sound started playing
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      log('received sound play, but active play does not match', this.state.activePlay, playId);
      return;
    }
    
    this.state.paused = false;
    this.state.activePlay.playStarted = true;

    // on the first play, tell the server we're good to go
    if (!this.state.activePlay.startReportedToServer) {
      return this.session.reportPlayStarted();
    }

    // subsequent plays are considered 'resumed' events
    this.trigger('play-resumed', this.session.getActivePlay());
  };

  Player.prototype.getActivePlay = function() {
    return this.session.getActivePlay();
  };

  Player.prototype.hasActivePlayStarted = function() {
    return this.session.hasActivePlayStarted();
  };

  Player.prototype.getActivePlacement = function() {
    return this.session.getActivePlacement();
  };

  Player.prototype._onSoundPause = function(playId) {
    // sound paused playback
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      log('received sound pause, but active play does not match', this.state.activePlay, playId);
      return;
    }
    
    this.state.paused = true;

    this.trigger('play-paused', this.session.getActivePlay());
  };

  Player.prototype._onSoundFinish = function(playId) {
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      log('received sound finish, but active play does not match', this.state.activePlay, playId);
      return;
    }

    log('completed playback of', playId);
    this.state.activePlay.soundCompleted = true;

    if (!this.state.activePlay.playStarted) {
      // never reported this as started...  mark it as invalidated so
      // we can advance.
      this.session.requestInvalidate();

      return;
    }

    if (!this.state.activePlay.startReportedToServer) {
      // if the song failed before we recieved start response, wait
      // until word from the server that we started before we say
      // that we completed the song
      return;
    }

    this.session.reportPlayCompleted();
  };

  Player.prototype._onSoundElapse = function(playId) {
    if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
      log('received sound elapse, but active play does not match', this.state.activePlay, playId);
      return;
    }

    var sound = this.state.activePlay.sound,
        position = sound.position(),
        interval = 30 * 1000,  // ping server every 30 seconds
        previousCount = Math.floor(this.state.activePlay.previousPosition / interval),
        currentCount = Math.floor(position / interval);

    this.state.activePlay.previousPosition = position;

    if (currentCount !== previousCount) {
      this.session.reportPlayElapsed(Math.floor(position / 1000));
    }
  };

  Player.prototype._onPlayStarted = function(play) {
    var session = this.session;

    if (!this.state.activePlay || (this.state.activePlay.id !== play.id)) {
      log('received play started, but it does not match active play', play, this.state.activePlay);
      return;
    }

    this.state.activePlay.startReportedToServer = true;

    if (this.state.activePlay.soundCompleted) {
      // the audio completed playback before the session announced the play started
      log('sound completed before we finished reporting start', this.state.activePlay);

      // In the normal case we'd just quit here, but since the audio completed playback
      // already, we've got to make sure a 'session.reportPlayCompleted()' gets kicked
      // off to record the completion of this song.
      // Defer the reporting so other 'play-started' handlers can complete as normal
      // before a 'play-completed' gets triggered

      _.defer(function() {
        session.reportPlayCompleted();
      });
    }
  };

  Player.prototype._onPlayCompleted = function(play) {
    if (!this.state.activePlay || (this.state.activePlay.id !== play.id)) {
      log('received play completed, but it does not match active play', play, this.state.activePlay);
      return;
    }

    log('deleting active play', this.state.activePlay);

    this.state.activePlay.sound.destroy();
    delete this.state.activePlay;

    // Force us into play mode in case we were paused and hit
    // skip to complete the current song.
    this.state.paused = false;
  };

  Player.prototype._onPlaysExhausted = function() {
    this.state.paused = false;
  };

  Player.prototype.isPaused = function() {
    return this.session.isTuned() && this.state.paused;
  };

  Player.prototype.getStationInformation = function(stationInformationCallback) {
    return this.session.getStationInformation(stationInformationCallback);
  };

  Player.prototype.tune = function() {
    var player = this;

    this.initializeSpeaker.then(function() {
      if (!player.session.isTuned()) {
        player.session.tune();
      }
    });
  };

  Player.prototype.play = function() {
    var player = this;

    this.initializeSpeaker.then(function() {
      player.speaker.initializeForMobile();

      if (!player.session.isTuned()) {
        // not currently playing music
        player.state.paused = false;

        return player.session.tune();

      } else if (player.session.getActivePlay() && player.state.activePlay && player.state.paused) {
        // resume playback of song
        if (player.state.activePlay.playStarted) {
          player.state.activePlay.sound.resume();

        } else {
          player.state.activePlay.sound.play();
        }
      }
    });
  };

  Player.prototype.pause = function() {
    if (!this.session.hasActivePlayStarted() || 
        !this.state.activePlay ||
        this.state.paused) {
      return;
    }

    // pause current song
    this.state.activePlay.sound.pause();
  };

  Player.prototype.like = function() {
    if (!this.session.hasActivePlayStarted()) {
      return;
    }

    this.session.likePlay(this.state.activePlay.id);

    this.trigger('play-liked');
  };

  Player.prototype.unlike = function() {
    if (!this.session.hasActivePlayStarted()) {
      return;
    }

    this.session.unlikePlay(this.state.activePlay.id);

    this.trigger('play-unliked');
  };

  Player.prototype.dislike = function() {
    if (!this.session.hasActivePlayStarted()) {
      return;
    }

    this.session.dislikePlay(this.state.activePlay.id);

    this.trigger('play-disliked');

    this.skip();
  };

  Player.prototype.skip = function() {
    if (!this.session.hasActivePlayStarted()) {
      // can't skip non-playing song
      return;
    }

    this.session.requestSkip();
  };

  Player.prototype.destroy = function() {
    this.session = null;

    if (this.state.activePlay && this.state.activePlay.sound) {
      this.state.activePlay.sound.destroy();
    }
  };

  Player.prototype.getCurrentState = function() {
    if (this.state.suspended) {
      return 'suspended';

    } else if (!this.session.hasActivePlayStarted()) {
      // nothing started, so we're idle
      return 'idle';

    } else {
      if (this.state.paused) {
        return 'paused';

      } else {
        return 'playing';
      }
    }
  };

  Player.prototype.getPosition = function() {
    if (this.state.activePlay && this.state.activePlay.sound) {
      return this.state.activePlay.sound.position();

    } else {
      return 0;
    }
  };

  Player.prototype.getDuration = function() {
    if (this.state.activePlay && this.state.activePlay.sound) {
      return this.state.activePlay.sound.duration();

    } else {
      return 0;
    }
  };

  Player.prototype.maybeCanSkip = function() {
    return this.session.maybeCanSkip();
  };

  var mutedKey = 'muted';
  Player.prototype.isMuted = function() {
    if (supports_html5_storage()) {
      if (mutedKey in localStorage) {
        return localStorage[mutedKey] === 'true';
      }
    }

    return false;
  };

  Player.prototype.setMuted = function(isMuted) {
    if (isMuted) {
      this.speaker.setVolume(0);
      
      if (supports_html5_storage()) {
        localStorage[mutedKey] = true;
      }

      this.trigger('muted');

    } else {
      this.speaker.setVolume(100);

      if (supports_html5_storage()) {
        localStorage[mutedKey] = false;
      }

      this.trigger('unmuted');
    }
  };

  Player.prototype.suspend = function() {
    var playing = (this.state.activePlay && this.state.activePlay.sound),
        state = this.session.suspend(playing ? this.state.activePlay.sound.position() : 0);

    this.pause();

    this.state.suspended = true;
    this.trigger('suspend');

    return state;
  };

  Player.prototype.unsuspend = function(state, startPlayback) {
    this.session.unsuspend(state);

    if (startPlayback) {
      this.play();
    }
  };

  return Player;

});

