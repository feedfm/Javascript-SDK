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
 *    remoteLogging: false  // when true, failed play starts or errors will cause the
 *                          // last 500 log entries from the player to be sent to
 *                          // feed.fm to assist with debugging.
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
 *  To retrieve a list of available stations, register for the 'stations' event,
 *  and then call `player.tune()`:
 * 
 *    player.on('stations', function(stations) {
 *       console.log('available stations', stations);
 *    });
 *    player.tune();
 * 
 *  or use the promise returned from `player.tune()`:
 *
 *    let stations = await player.tune();
 *
 *  Then control playback with:
 *
 *    play() - start playing the current placement/station or resume the current song
 *    pause() - pause playback of the current song, if any
 *    like() - tell the server we like this song
 *    unlike() - tell the server to remove the 'like' for this song
 *    dislike() - tell the server we dislike this song, and skip to the next one
 *    skip() - request to skip the current song
 *    setStationId(id [, fade]) - switch to a different station. Optionally set 'fade' to true to
 *         crossfade playback to the new station. This has a side effect of triggering
 *         a 'station-changed' event.
 *    setStationId(id, advanceTo) - switch to station with id `id`, and begin playback of that
 *         station at `advanceTo` seconds from the start of the station. This only works for first play
 *         or single play stations, and will trigger an error for other stations.
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
 *    station-changed - the current station from which music is pulled has changed.
 *                      this is triggered in response to a 
 *    stations - this is triggered after a call to `tune()`, and passes the event handler an
 *               array of all stations available for playback. Alterntively, the
 *               `getStations()` method returns a promise that resolves to the same
 *               value.
 *    music-unavailable - user isn't located in the US and can't play music
 *    play-started - this play has begun playback. The event handler is passed a 
 *                   'play' object with song metadata. If the event was triggered
 *                   via a `Feed.resumable().tune()` call, then a second argument
 *                   of `true` will be passed to the event handler.
 *    play-paused - the currently playing song has been paused. The event handler
 *                    is passed a 'play' object with song metadata. if the event
 *                   was triggered via a `Feed.resumable().tune()` call, then a
 *                   second argument of `true` will be passed to the event handler.
 *    play-stopped - player.stop() has been called
 *    skip-denied - the given song could not be skipped due to DMCA rules
 *    skip-failed - the request to skip a song was denied
 *    forbidden - an unsatisfiable request for music was made (currently only
 *       triggered when trying to start playback in the middle of a non-first
 *       play station with the `advanceTo` argument to `setStationId`)
 *
 *  Some misc methods:
 *
 *    setMuted(muted)
 *
 */

import { clearPersistance, persistElapsed, persistState } from './persist';

import Events from './events';
import Session from './session';
import Speaker from './speaker';
import { getBaseUrl } from './base-url';
import { getClientId } from './client-id';
import { intersection } from './util';
import log from './log';

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null && (window.localStorage['feed-test'] = true);
  } catch (e) {
    return false;
  }
}

var Player = function (token, secret, options) {
  if (!secret) {
    // restore from saved state
    // this._restore(token);
    console.log("^^^ this was messing up chromecast");
  } else {
    options = options || {};
    this.options = options;

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

    const speaker = this.speaker = new Speaker();
    
    var session = this.session = new Session(token, secret, options);

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
  }

  Object.assign(this, Events);

  this.session.on('play-active', this._onPlayActive, this);
  this.session.on('play-started', this._onPlayStarted, this);
  this.session.on('play-completed', this._onPlayCompleted, this);
  this.session.on('plays-exhausted', this._onPlaysExhausted, this);
  this.session.on('prepare-sound', this._onPrepareSound, this);

  this.session.on('placement', this._onPlacement, this);
  this.session.on('stations', this._onStations, this);
  this.session.on('station-changed', this._onStationChanged, this);

  let player = this;
  for (let event of [ 'music-unavailable', 'not-in-us', 'invalid-credentials', 'skip-denied', 'play-active', 'forbidden']) {
    this.session.on(event, function() {
      player.trigger.apply(player, [ event ].concat(Array.prototype.slice.call(arguments, 0)));
    });
  }

  this.setMuted(this.isMuted());
};

Player.prototype._persist = function() {
  const playerState = shallowCopy(this.state);
  if (playerState.activePlay) {
    // remove the 'sound' object
    playerState.activePlay = shallowCopy(playerState.activePlay);
    delete playerState.activePlay.sound;
  }

  const persisted = {
    state: playerState,
    options: this.options,
    trimming: this.trimming,
    normalizeVolume: this.normalizeVolume,
    secondsOfCrossfade: this.secondsOfCrossfade,
    crossfadeIn: this.crossfadeIn,
    _station: this._station,
    _stations: this._stations,
    _placement: this._placement,
    sessionConfig: this.session.config
  };

  return persisted;
};

Player.prototype._restore = function({ persisted, elapsed }) {
  if (persisted.options.debug) {
    log.enable();
  }

  log('restoring!');

  // session will be initialized with no current play
  const sessionConfig = persisted.sessionConfig;
  const sessionCurrent = sessionConfig.current;

  sessionConfig.current = null;
  sessionConfig.pendingRequest = null;
  sessionConfig.pendingPlay = null;

  this.session = new Session();
  this.session.config = sessionConfig;

  this.speaker = new Speaker();

  this.options = persisted.options;
  
  // start off in paused state
  this.state = {
    paused: true,
    simulcast: this.options.simulcast
  };

  this.trimming = persisted.trimming;
  this.normalizeVolume = persisted.normalizeVolume;
  this.secondsOfCrossfade = persisted.secondsOfCrossfade;
  this.crossfadeIn = persisted.crossfadeIn;

  this._stationsPromise = new Promise((resolve, reject) => {
    this._stationsResolve = resolve;
    this._stationsReject = reject;
  });

  // at this point, we're in a state similar to a newly initialized player,
  // but the session object has placement/station info

  // swap out the default tune
  this.tune = function() {
    // on the next tick, throw out events to simulate a normal tune() call
    return Promise
      .resolve(true)
      .then(() => {
        this._station = persisted._station;
        this._stations = persisted._stations;
        this._placement = persisted._placement;

        this._stationsResolve(persisted._stations);
  
        this.trigger('placement', this._placement);
        this.trigger('station-changed', this._station);
        this.trigger('stations', this._stations);

        // stick the previously active song into the session
        this.session.config.current = sessionCurrent;
        this.session.config.current.started = false;

        let play = this.session.config.current.play;

        // get the player to create a sound object with the audio advanced to the
        // old elapsed position
        play.start_at = elapsed / 1000;
        this.session.trigger('play-active', play);

        this.session.config.current.started = true;

        // pretend the song was started
        this.state.paused = false;
        this.session.trigger('play-started', play, true);

        // announce that the song is paused
        this.state.paused = true;
        this.trigger('play-paused', play, true);

      // now we're in the same spot we'd be if we played and paused.
      })
      .then(() => this._stationsPromise);
  };
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
    // when offsetting into a station, ignore the trim and honor the start_at
    options.startPosition = play.start_at * 1000;

  } else {
    if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_start) {
      options.startPosition = play.audio_file.extra.trim_start * 1000;
    }

  }

  if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_end && play.audio_file.duration_in_seconds) {
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

  const playerWasResumed = this.state.activePlay.playStarted;

  this.state.activePlay.playStarted = true;

  // on the first play, tell the server we're good to go
  if (!this.state.activePlay.startReportedToServer) {
    // save the state so we can restore
    persistState(this._persist());
    
    return this.session.reportPlayStarted();
  
  } else if (!playerWasResumed) {
    // subsequent plays are considered 'resumed' events
    this.trigger('play-resumed', this.session.getActivePlay());
  }
  
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
    this.trigger('invalidated', playId);
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
    this.trigger('invalidated', playId);
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

  persistElapsed(position);

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
      setTimeout(() => {
        this.trigger('invalidated', play.id);
        session.requestInvalidate();
      }, 1);

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

  return this._stationsPromise;
};

/**
 * This call triggers the SDK to load the next song into memory and
 * returns a promise that resolves when the next song is fully loaded
 * and ready for immediate playback via play().
 * 
 * Additionally, this method triggers a 'prepared' event on the player
 * object when the next song is fully loaded and ready for immediate
 * playback.
 * 
 * Note: a song cannot be fully loaded into memory until initializeAudio()
 * has been called. The promise returned by this method will not resolve
 * unless initializeAudio() is successfully called before or after this
 * method.
 * 
 * @returns Promise that resolves when a song is in memory and ready for immediate playback
 */

Player.prototype.prepare = function () {
  log('PREPARE');

  this.speaker.initializeAudio();

  let ap = this.state.activePlay;
  if (ap) {
    let prepared = this.speaker.prepare(ap.sound.url, ap.sound.startPosition);

    if (prepared) {
      return Promise.resolve(true).then(() => {
        log('already prepared');
        this.trigger('prepared');
      });
    } else {
      return new Promise((resolve) => {
        log('waiting for prepared event');
        this.speaker.on('prepared', () => resolve(true));
      }).then(() => {
        this.trigger('prepared');
      });
    }
  } else {
    return new Promise((resolve) => {
      this.session.once('play-active', (play) => {
        log('play active');
        let startPosition;

        if (play.start_at) {
          // when offsetting into a station, ignore the trim and honor the start_at
          startPosition = play.start_at * 1000;
      
        } else {
          if (this.trimming && play.audio_file.extra && play.audio_file.extra.trim_start) {
            startPosition = play.audio_file.extra.trim_start * 1000;
          }

        }

        let ready = this.speaker.prepare(play.audio_file.url, startPosition);

        if (ready) {
          log('song is prepared!');
          resolve(true);
        } else {
          this.speaker.on('prepared', resolve);
        }
      });

      if (!this.session.isTuned()) {
        log('tuning');
        this.session.tune();
      }

    }).then(() => this.trigger('prepared'));
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

  clearPersistance();

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


function shallowCopy(obj) {
  if (obj === null) {
    return null;
  }

  return Object.assign({}, obj);
}


export default Player;
