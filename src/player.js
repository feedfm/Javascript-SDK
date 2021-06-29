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
 *    trimming: true,       // when true, song start/end trims will be honored
 *    crossfadeIn: false,   // when true, songs do not fade in - they start at full volume
 *    normalizeVolume: true, // automatically adjust volume of songs in station to be at same approx loudness
 *    secondsOfCrossfade: 0 // number of seconds to crossfade songs during song transitions
 *    simulcast: 'uuid'     // id to announce music playback on, for simulcast listeners
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
 *    play() - start playing the current placement/station or resume the current song
 *    pause() - pause playback of the current song, if any
 *    like() - tell the server we like this song
 *    unlike() - tell the server to remove the 'like' for this song
 *    dislike() - tell the server we dislike this song, and skip to the next one
 *    skip() - request to skip the current song
 *    setStationId(xxx, fade) - switch to a different station. Optionally set 'fade' to true to
 *         crossfade playback to the new station
 *    setVolume(xxx) - adjust music volume (0-100)
 *    getVolume() - retrieve music volume (0-100)
 *
 *  player has a current state that can be queried with 'getCurrentState()':
 *    uninitialized - player is still trying to initialize
 *    unavailable - no music is available
 *    idle - ready for playback, not playing anything
 *    playing - if session.hasActivePlayStarted() and we're not paused
 *    paused -  if session.hasActivePlayStarted() and we're paused
 * 
 *  events emitted by the player:
 *    music-unavailable - user isn't located in the US and can't play music
 *    play-started - this play has begun playback.
 *    play-stopped - player.stop() has been called
 *    skip-denied - the given song could not be skipped due to DMCA rules
 *    skip-failed - the request to skip a song was denied
 *    forbidden - an unsatisfiable request for music was made (such as
 *        trying to start playback in the middle of a non-first play station)
 *
 *  Some misc methods:
 *
 *    setMuted(muted)
 *
 */

import { intersection } from './util';
import Speaker from './speaker';
import log from './log';
import Events from './events';
import Session from './session';
import { getBaseUrl } from './base-url';
import { getClientId } from './client-id';

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null && (window.localStorage['feed-test'] = true);
  } catch (e) {
    return false;
  }
}

var Player = function (token, secret, options) {
  options = options || {};

  this.state = {
    paused: true,
    // activePlay
    simulcast: options.simulcast
  };

  if (options.debug) {
    log.enable();
  }
  
  // this._station = current station
  // this._stations = list of available stations
  // this._placement = current placement

  this.trimming = (options.trimming === false) ? false : true;
  this.normalizeVolume = ('normalizeVolume' in options) ? options.normalizeVolume : true;
  this.secondsOfCrossfade = options.secondsOfCrossfade || 0;
  this.crossfadeIn = !!options.crossfadeIn;
  this._stationsPromise = new Promise((resolve, reject) => {
    this._stationsResolve = resolve;
    this._stationsReject = reject;
  });

  Object.assign(this, Events);

  var session = this.session = new Session(token, secret, options);
  this.session.on('play-active', this._onPlayActive, this);
  this.session.on('play-started', this._onPlayStarted, this);
  this.session.on('play-completed', this._onPlayCompleted, this);
  this.session.on('plays-exhausted', this._onPlaysExhausted, this);
  this.session.on('prepare-sound', this._onPrepareSound, this);

  this.session.on('placement', this._onPlacement, this);
  this.session.on('stations', this._onStations, this);
  this.session.on('station-changed', this._onStationChanged, this);

  let player = this;
  for (let event of [ 'music-unavailable', 'not-in-us', 'invalid-credentials', 'skip-denied', 'play-active', 'prepare-sound', 'forbidden']) {
    this.session.on(event, function() {
      player.trigger.apply(player, [ event ].concat(Array.prototype.slice.call(arguments, 0)));
    });
  }

  const speaker = this.speaker = new Speaker();

  if (options.brokenWebkitFormats && Speaker.brokenWebkit) {
    let reqFormatList = options.brokenWebkitFormats.split(','),
      suppFormatList = speaker.getSupportedFormats().split(','),
      reqAndSuppFormatList = intersection(reqFormatList, suppFormatList),
      reqAndSuppFormats = reqAndSuppFormatList.join(',');

    log('input format list is', reqFormatList, suppFormatList);
    log('final support list is', reqAndSuppFormats);

    if (reqAndSuppFormatList.length === 0) {
      reqAndSuppFormats = speaker.getSupportedFormats();
    }

    session.setFormats(reqAndSuppFormats);

  } else if (options.formats) {
    let reqFormatList = options.formats.split(','),
      suppFormatList = speaker.getSupportedFormats().split(','),
      reqAndSuppFormatList = intersection(reqFormatList, suppFormatList),
      reqAndSuppFormats = reqAndSuppFormatList.join(',');

    if (reqAndSuppFormatList.length === 0) {
      reqAndSuppFormats = speaker.getSupportedFormats();
    }

    log('input format list is', reqFormatList, suppFormatList);
    log('final support list is', reqAndSuppFormats);

    session.setFormats(reqAndSuppFormats);

  } else {
    session.setFormats(speaker.getSupportedFormats());
  }

  this.setMuted(this.isMuted());
};

Player.prototype.initializeAudio = function () {
  log('INTIALIZE AUDIO');
  this.speaker.initializeAudio();
};

Player.prototype._onPlacement = function(placement) {
  this._placement = placement;

  if (placement.options && placement.options.crossfade_seconds) {
    this.secondsOfCrossfade = placement.options.crossfade_seconds;
  }

  this.trigger('placement', placement);
};

Player.prototype._onStations = function(stations) {
  this._stations = stations;

  this._stationsResolve(stations);

  this.trigger('stations', stations);
};

Player.prototype._onStationChanged = function(stationId, station) {
  this._station = station;

  if (station.options && ('crossfade_seconds' in station.options)) {
    // apply station level crossfade, if available
    this.secondsOfCrossfade = station.options.crossfade_seconds;
    
  } else if (this._placement.options && ('crossfade_seconds' in this._placement.options)) {
    // revert to placement level crossfade, if available
    this.secondsOfCrossfade = this._placement.options.crossfade_seconds;

  }

  this.trigger('station-changed', stationId, station);
};

Player.prototype.setStationId = function (stationId, fadeOutOrAdvance) {
  let advance;
  let fadeOut = false;

  if (fadeOutOrAdvance === true) {
    fadeOut = fadeOutOrAdvance;

    log('SET STATION ID (WITH FADE)', stationId);

  } else if (fadeOutOrAdvance) {
    advance = fadeOutOrAdvance;

    log('SET STATION ID (WITH ADVANCE)', stationId, advance);
  
  }

  if (fadeOut && this.state.activePlay) {
    // when we destroy the sound, have it fade out
    this.state.activePlay.fadeOnDestroy = true;
  }

  this.session.setStationId(stationId, advance, this.crossfadeIn);
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

  if (play.start_at) {
    options.startPosition = play.start_at * 1000;

  } else {
    if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_start) {
      options.startPosition = play.audio_file.extra.trim_start * 1000;
    }

    if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_end &&
    play.audio_file.duration_in_seconds) {
      options.endPosition = (play.audio_file.duration_in_seconds - play.audio_file.extra.trim_end) * 1000;
    }
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
    fadeOnDestroy: false,         // when true, apply a fade out when destroying the sound
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

    if (withError.name === 'NotAllowedError') {
      // eslint-disable-next-line no-console
      console.error('Feed.fm: first call to "initializeAudio()" or "play()" must be made in user-initiated event handler');
      this.stop();
      return;
    }
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
    log('song completed with error - marking as invalid', withError);
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

  this.updateSimulcast();

  this.trigger('play-started', play);
};

Player.prototype._onPlayCompleted = function (play) {
  if (!this.state.activePlay || (this.state.activePlay.id !== play.id)) {
    log('received play completed, but it does not match active play', play, this.state.activePlay);
    return;
  }

  this.state.activePlay.sound.destroy(this.state.activePlay.fadeOnDestroy);

  let started = this.state.activePlay.playStarted;

  delete this.state.activePlay;

  if (started) {
    this.trigger('play-completed', play);
  }

  // skip to complete the current song.
  //this.state.paused = false;
};

Player.prototype._onPlaysExhausted = function () {
  this.state.paused = false;

  this.updateSimulcast();
  this.trigger('plays-exhausted');
};

Player.prototype._onPrepareSound = function (url, startPosition) {
  log('preparing', url, startPosition);
  this.speaker.prepare(url, startPosition * 1000);
};

Player.prototype.isPaused = function () {
  return this.session.isTuned() && this.state.paused;
};

Player.prototype.getStationInformation = function (stationInformationCallback) {
  return this.session.getStationInformation(stationInformationCallback);
};

Player.prototype.tune = function () {
  log('TUNE');

  if (!this.session.isTuned()) {
    this.session.tune();
  }
};

Player.prototype.play = function () {
  log('PLAY');

  const session = this.session;
  const state = this.state;

  this.speaker.initializeAudio();

  if (!session.isTuned()) {
    // not currently playing music
    state.paused = false;

    return session.tune();
  }

  if (session.getActivePlay() && state.activePlay && state.paused) {
    // resume playback of song
    if (state.activePlay.playStarted) {
      state.activePlay.sound.resume();

    } else {
      state.activePlay.sound.play();

    }
  }

  // 'start' event from sound will definitely be asynchronous, so prevent repeated calls
  state.paused = false;

  this.updateSimulcast();
};

Player.prototype.pause = function () {
  log('PAUSE');

  if (!this.session.hasActivePlayStarted() ||
    !this.state.activePlay ||
    this.state.paused) {
    return;
  }

  // pause current song
  this.state.activePlay.sound.pause();

  // 'pause' event from sound might be asynchronous, so prevent repeated calls
  this.state.paused = true;

  this.updateSimulcast();
};

Player.prototype.like = function () {
  log('LIKE');

  if (!this.session.hasActivePlayStarted()) {
    return;
  }

  this.session.likePlay(this.state.activePlay.id);

  this.trigger('play-liked');
};

Player.prototype.unlike = function () {
  log('UNLIKE');

  if (!this.session.hasActivePlayStarted()) {
    return;
  }

  this.session.unlikePlay(this.state.activePlay.id);

  this.trigger('play-unliked');
};

Player.prototype.dislike = function () {
  log('DISLIKE');

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
  log('SKIP');

  if (!this.session.hasActivePlayStarted()) {
    // can't skip non-playing song
    return;
  }

  this.state.paused = false;

  this.session.requestSkip();
};

Player.prototype.stop = function () {
  log('STOP');

  this.state.paused = true;
  
  var activePlay = this.state.activePlay;
  if (activePlay && activePlay.sound) {
    log('stopping active play', activePlay);

    if (activePlay.startReportedToServer) {
      // report where we played to
      var position = activePlay.sound.position();
      this.session.reportPlayStopped(Math.floor(position / 1000));
    }

    // stop any playback
    activePlay.sound.pause();
    activePlay.sound.destroy();

  } else {
    log('no active play');
  }

  delete this.state.activePlay;

  // flush out any prepared sounds
  this.speaker.flush();

  this.trigger('play-stopped');
  
  this.updateSimulcast();
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
  return !!this.session.maybeCanSkip();
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

Player.prototype.getVolume = function() {
  return this.speaker.getVolume();
};

Player.prototype.setVolume = function(vol) {
  this.speaker.setVolume(vol);
};

Player.prototype.getStations = function() {
  return this._stationsPromise;
};

Player.prototype.updateSimulcast = function() {
  if (!this.state.simulcast) {
    return;
  }

  let state = this.getCurrentState();

  if (state === 'suspended') {
    state = 'idle';
  }

  getClientId().then((clientId) => {
    this.session._signedAjax(getBaseUrl() + `/api/v2/simulcast/${this.state.simulcast}/in-progress`, {
      method: 'POST',
      body: JSON.stringify({
        state: state,
        client_id: clientId
      }),
      headers: {
        'Content-Type': 'application/json'
      },
    });
  });
};

export default Player;
