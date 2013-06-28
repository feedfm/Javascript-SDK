/*global _:false */
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
 *    player = new Feed.Player(token, secret)
 *
 *  Then set the placement (and optionally station) that we're pulling
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
 *    skip() - request to skip the current song
 *
 *  player has a current state that can be queried with 'getCurrentState()':
 *    playing - if session.hasActivePlayStarted() and we're not paused
 *    paused -  if session.hasActivePlayStarted() and we're paused
 *    waiting - if session.waitingForRequest() or session.hasActivePlayStarted() and we're
 *       still loading an mp3
 *    idle - if !session.hasActivePlayStarted()
 *
 *  session events are proxied via the play object:
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
 *
 *  Some misc methods:
 *
 *    setMuted(muted)
 *
 */

(function() {
  var log = window.Feed.log;

  function supports_html5_storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  var Player = function(token, secret, options) {
    this.state = {
      paused: true
      // activePlay
    };

    options = options || {};

    _.extend(this, window.Feed.Events);

    this.session = new window.Feed.Session(token, secret);
    this.session.on('play-active', this._onPlayActive, this);
    this.session.on('play-completed', this._onPlayCompleted, this);
    this.session.on('plays-exhausted', this._onPlaysExhausted, this);

    this.speaker = window.Feed.getSpeaker(options);
    this.setMuted(this.isMuted());

    this.session.on('all', function() {
      log('proxying from', this, arguments);
      // propagate all events out to everybody else
      this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
    }, this);
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
    var sound = this.speaker.create(play.audio_file.url, {
      play: _.bind(this._onSoundPlay, this),
      pause: _.bind(this._onSoundPause, this),
      finish:  _.bind(this._onSoundFinish, this)
    });

    this.state.activePlay = {
      id: play.id,
      sound: sound,
      playCount: 0
    };

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

  Player.prototype._onSoundPlay = function() {
    // sound started playing
    if (!this.state.activePlay) {
      throw new Error('got an onSoundPlay, but no active play?');
    }
    
    this.state.activePlay.playCount++;

    this.state.paused = false;

    // on the first play, tell the server we're good to go
    if (this.state.activePlay.playCount === 1) {
      return this.session.reportPlayStarted();
    }

    // subsequent plays are considered 'resumed' events
    this.trigger('play-resumed', this.session.getActivePlay());
  };

  Player.prototype._onSoundPause = function() {
    // sound paused playback
    if (!this.state.activePlay) {
      throw new Error('got an onSoundPause, but no active play?');
    }
    
    this.state.paused = true;

    this.trigger('play-paused', this.session.getActivePlay());
  };

  Player.prototype._onSoundFinish = function() {
    if (!this.state.activePlay) {
      throw new Error('got an onSoundFinished, but no active play?');
    }

    this.session.reportPlayCompleted();
  };

  Player.prototype._onPlayCompleted = function() {
    if (!this.state.activePlay) {
      throw new Error('got onPlayCompleted, but no active play!');
    }

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
    if (!this.session.isTuned()) {
      this.session.tune();
    }
  };

  Player.prototype.play = function() {
    this.speaker.initializeForMobile();

    if (!this.session.isTuned()) {
      // not currently playing music
      this.state.paused = false;

      return this.session.tune();

    } else if (this.session.getActivePlay && this.state.activePlay && this.state.paused) {
      // resume playback of song
      if (this.state.activePlay.playCount > 1) {
        this.state.activePlay.sound.resume();

      } else {
        this.state.activePlay.sound.play();
      }
    } else {
      log('state', this.state);
    }

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
    if (!this.session.hasActivePlayStarted()) {
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

  window.Feed = window.Feed || {};
  window.Feed.Player = Player;
})();

