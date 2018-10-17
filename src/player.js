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
 *  options can be:
 *    debug: false,         // when true, display console logging statements
 *    trimming: false,      // when true, song start/end trims will be honored
 *    crossfadeIn: false,   // when true, songs do not fade in - they start at full volume
 *    normalizeVolume: true, // automatically adjust volume of songs in station to be at same approx loudness
 *    secondsOfCrossfade: 0 // number of seconds to crossfade songs during song transitions
 *
 *  In response to a user-interaction event, and before you begin any
 *  music playback, be sure to call:
 *
 *    player.initializeAudio();
 *
 *  That will ensure the library has permission from the browser to play
 *  audio.
 *
 *  Then control playback with:
 *
 *    tune() - load up information about the current placement, but
 *      don't actually start playing it. (can be called before initializeAudio())
 *    play() - start playing the current placement/station or resume the current song
 *    pause() - pause playback of the current song, if any
 *    like() - tell the server we like this song
 *    unlike() - tell the server to remove the 'like' for this song
 *    dislike() - tell the server we dislike this song, and skip to the next one
 *    skip() - request to skip the current song
 *    setStationId(xxx) - switch to a different station 
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
 *    stations - this is passed with an array of station objects that have station
 *      names and ids
 *    play-active - this play is queued up and ready for playback, but hasn't
 *      yet started.
 *    play-started - this play has begun playback.
 *    play-completed  - this play has completed playback.
 *    plays-exhausted - there are no more plays available from this placement/station combo
 *    skip-denied - the given song could not be skipped due to DMCA rules
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

import { intersection } from './util';
import Speaker from './speaker';
import log from './log';
import Events from './events';
import Session from './session';

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null && (window.localStorage['feed-test'] = true);
  } catch (e) {
    return false;
  }
}

var Player = function (token, secret, options) {
  this.state = {
    paused: true,
    suspended: false
    // activePlay
  };

  options = options || {};

  if (options.debug) {
    log.enable();
  }
  
  this.trimming = options.trimming || false;
  this.normalizeVolume = options.normalizeVolume || true;
  this.secondsOfCrossfade = options.secondsOfCrossfade || 0;
  this.crossfadeIn = options.crossfadeIn || false;

  Object.assign(this, Events);

  var session = this.session = new Session(token, secret, options);
  this.session.on('play-active', this._onPlayActive, this);
  this.session.on('play-started', this._onPlayStarted, this);
  this.session.on('play-completed', this._onPlayCompleted, this);
  this.session.on('plays-exhausted', this._onPlaysExhausted, this);
  this.session.on('prepare-sound', this._onPrepareSound, this);

  this.session.on('all', function () {
    // propagate all events out to everybody else
    this.trigger.apply(this, Array.prototype.slice.call(arguments, 0));
  }, this);

  // TODO: update to create speaker object & use getSupportedFormats()
  const speaker = this.speaker = new Speaker();
  if (options.formats) {
    var reqFormatList = options.formats.split(','),
      suppFormatList = speaker.getSupportedFormats().split(','),
      reqAndSuppFormatList = intersection(reqFormatList, suppFormatList),
      reqAndSuppFormats = reqAndSuppFormatList.join(',');

    log('input lists are', reqFormatList, suppFormatList);
    log('final support list is', reqAndSuppFormats);

    if (reqAndSuppFormatList.length === 0) {
      reqAndSuppFormats = speaker.getSupportedFormats();
    }

    session.setFormats(reqAndSuppFormats);

  } else {
    session.setFormats(speaker.getSupportedFormats());
  }

  this.setMuted(this.isMuted());
};

Player.prototype.initializeAudio = function () {
  this.speaker.initializeAudio();
};

Player.prototype.setPlacementId = function (placementId) {
  this.session.setPlacementId(placementId);
};

Player.prototype.setStationId = function (stationId) {
  this.session.setStationId(stationId);
};

Player.prototype.setBaseUrl = function (baseUrl) {
  this.session.setBaseUrl(baseUrl);
};

Player.prototype._onPlayActive = function (play) {
  // create a new sound object
  var options = {
    play: this._onSoundPlay.bind(this, play.id),
    pause: this._onSoundPause.bind(this, play.id),
    finish: this._onSoundFinish.bind(this, play.id),
    elapse: this._onSoundElapse.bind(this, play.id)
  };

  if (this.normalizeVolume) {
    options.gain = (play.audio_file.replaygain_track_gain || 0) + (play.station.pre_gain || 0);
  }

  if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_start) {
    options.startPosition = play.audio_file.extra.trim_start * 1000;
  }

  if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_end &&
    play.audio_file.duration_in_seconds) {
    options.endPosition = (play.audio_file.duration_in_seconds - play.audio_file.extra.trim_end) * 1000;
  }

  if (this.secondsOfCrossfade) {
    if (this.crossfadeIn) {
      options.fadeInSeconds = this.secondsOfCrossfade;
    }

    options.fadeOutSeconds = this.secondsOfCrossfade;
  }

  var sound = this.speaker.create(play.audio_file.url, options);

  this.state.activePlay = {
    id: play.id,
    sound: sound,
    startReportedToServer: false, // whether we got a 'play-started' event from session
    soundCompleted: false,        // whether the sound object told us it finished playback
    playStarted: false,           // whether playback started on the sound object yet
    previousPosition: 0           // last time we got an 'elapse' callback
  };

  // if we're not paused, then start it
  if (!this.state.paused) {
    var s = this.state.activePlay.sound;

    s.play();
  }
};

Player.prototype._onSoundPlay = function (playId) {
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

Player.prototype.getActivePlay = function () {
  return this.session.getActivePlay();
};

Player.prototype.hasActivePlayStarted = function () {
  return this.session.hasActivePlayStarted();
};

Player.prototype.getActivePlacement = function () {
  return this.session.getActivePlacement();
};

Player.prototype._onSoundPause = function (playId) {
  // sound paused playback
  if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
    log('received sound pause, but active play does not match', this.state.activePlay, playId);
    return;
  }

  this.state.paused = true;

  this.trigger('play-paused', this.session.getActivePlay());
};

Player.prototype._onSoundFinish = function (playId, withError) {
  if (!this.state.activePlay || (this.state.activePlay.id !== playId)) {
    log('received sound finish, but active play does not match', this.state.activePlay, playId);
    return;
  }

  this.state.activePlay.soundCompleted = true;
  if (withError) {
    this.state.activePlay.soundCompletedWithError = true;
  }

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

  if (withError) {
    log('song completed with error - marking as invalid');
    this.session.requestInvalidate();

  } else {
    this.session.reportPlayCompleted();
  }
};

Player.prototype._onSoundElapse = function (playId) {
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

Player.prototype._onPlayStarted = function (play) {
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

    if (this.state.activePlay.soundCompletedWithError) {
      setTimeout(() => session.requestInvalidate(), 1);

    } else {
      setTimeout(() => session.reportPlayCompleted(), 1);

    }
  }
};

Player.prototype._onPlayCompleted = function (play) {
  if (!this.state.activePlay || (this.state.activePlay.id !== play.id)) {
    log('received play completed, but it does not match active play', play, this.state.activePlay);
    return;
  }

  this.state.activePlay.sound.destroy();
  delete this.state.activePlay;

  // skip to complete the current song.
  //this.state.paused = false;
};

Player.prototype._onPlaysExhausted = function () {
  this.state.paused = false;
};

Player.prototype._onPrepareSound = function (url) {
  log('preparing', url);
  this.speaker.prepare(url);
};

Player.prototype.isPaused = function () {
  return this.session.isTuned() && this.state.paused;
};

Player.prototype.getStationInformation = function (stationInformationCallback) {
  return this.session.getStationInformation(stationInformationCallback);
};

Player.prototype.tune = function () {
  if (!this.session.isTuned()) {
    this.session.tune();
  }
};

Player.prototype.play = function () {
  const session = this.session;
  const state = this.state;

  if (!session.isTuned()) {
    // not currently playing music
    state.paused = false;

    return session.tune();

  } else if (session.getActivePlay() && state.activePlay && state.paused) {
    // resume playback of song
    if (state.activePlay.playStarted) {
      state.activePlay.sound.resume();

    } else {
      state.activePlay.sound.play();
    }

  } else {
    // waiting for network request to complete
    state.paused = false;

  }
};

Player.prototype.pause = function () {
  if (!this.session.hasActivePlayStarted() ||
    !this.state.activePlay ||
    this.state.paused) {
    return;
  }

  // pause current song
  this.state.activePlay.sound.pause();
};

Player.prototype.like = function () {
  if (!this.session.hasActivePlayStarted()) {
    return;
  }

  this.session.likePlay(this.state.activePlay.id);

  this.trigger('play-liked');
};

Player.prototype.unlike = function () {
  if (!this.session.hasActivePlayStarted()) {
    return;
  }

  this.session.unlikePlay(this.state.activePlay.id);

  this.trigger('play-unliked');
};

Player.prototype.dislike = function () {
  if (!this.session.hasActivePlayStarted()) {
    return;
  }

  this.session.dislikePlay(this.state.activePlay.id);

  this.trigger('play-disliked');

  // start playback if we're paused and try to advance to next song
  this.state.paused = false;
  this.skip();
};

Player.prototype.skip = function () {
  if (!this.session.hasActivePlayStarted()) {
    // can't skip non-playing song
    return;
  }

  // start playback if we're paused
  this.state.paused = false;
  this.session.requestSkip();
};

Player.prototype.destroy = function () {
  this.session = null;

  if (this.state.activePlay && this.state.activePlay.sound) {
    this.state.activePlay.sound.destroy();
  }
};

Player.prototype.getCurrentState = function () {
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

Player.prototype.getPosition = function () {
  if (this.state.activePlay && this.state.activePlay.sound) {
    return this.state.activePlay.sound.position();

  } else {
    return 0;
  }
};

Player.prototype.getDuration = function () {
  if (this.state.activePlay && this.state.activePlay.sound) {
    return this.state.activePlay.sound.duration();

  } else {
    return 0;
  }
};

Player.prototype.maybeCanSkip = function () {
  return this.session.maybeCanSkip();
};

var mutedKey = 'muted';
Player.prototype.isMuted = function () {
  if (supports_html5_storage()) {
    if (mutedKey in localStorage) {
      return localStorage[mutedKey] === 'true';
    }
  }

  return false;
};

Player.prototype.setMuted = function (isMuted) {
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

Player.prototype.suspend = function () {
  var playing = (this.state.activePlay && this.state.activePlay.sound),
    state = this.session.suspend(playing ? this.state.activePlay.sound.position() : 0);

  this.pause();

  this.state.suspended = true;
  this.trigger('suspend');

  return state;
};

Player.prototype.unsuspend = function (state, startPlayback) {
  this.session.unsuspend(state);

  if (startPlayback) {
    this.play();
  }
};

export default Player;
