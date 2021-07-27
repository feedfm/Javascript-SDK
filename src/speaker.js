/*
 * The speaker object uses native web audio, and the interface boils it down
 * to the following api:
 *
 *    speaker.initializeAudio(): many clients can only start using
 *      audio when handling an 'onClick' event. This call should be made 
 *      at that time to get audio initialized while waiting for details
 *      of what to play from the server. 
 *
 *    speaker.setVolume(value): set the volume from 0 (mute) - 100 (full volume)
 *
 *    var sound = speaker.create(url, optionsAndEvents): create a new sound from the
 *       given url and return a 'song' object that can be used to pause/play/
 *       destroy the song and receive trigger events as the song plays/stops. 
 *
 *       The 'optionsAndEvents' is an object that lets you specify event
 *       handlers and options:
 *
 *          startPosition:  specifies the time offset (in milliseconds) that the
 *                          sound should begin playback at when we begin playback.
 *          endPosition:    specifies the time offset (in milliseconds) that the
 *                          sound should stop playback 
 *          fadeInSeconds:  # of seconds to fade in audio
 *          fadeOutSeconds: # of seconds to fade out audio
 *          play:           event handler for 'play' event
 *          pause:          event handler for 'pause' event
 *          finish:         event handler for 'finish' event
 *          elapse:         event handler for 'elapse' event
 *
 *       The returned object emits the following events:
 *         play: the song has started playing or resumed playing after pause
 *         pause: the song has paused playback
 *         finish: the song has completed playback and the song object
 *           is no longer usable and should be destroyed
 *         elapse: song playback has elapsed
 *
 *       The events should be received in this order only:
 *         ( play -> ( pause | play )* -> )? finish
 *
 *       Note that I represent play failures as a 'finish' call, so if
 *       we can't load a song, it will just get a 'finish' and no 'play'.
 *       The 'finish' event will have a 'true' argument passed to it on
 *       some kind of error, so you can treat those differently.
 *
 *       The returned song object has this following api:
 *         play: start playback (at the 'startPosition', if specified)
 *         pause: pause playback
 *         resume: resume playback
 *         destroy: stop playback, prevent any future playback, and free up memory
 *
 *   The speaker assumes that you'll be playing only one sound at a time. When 
 *   you kick off playback of a sound, it stops playback of any existing sound.
 *   Fade-outs are handled by reporting the audio as complete when the fade-out
 *   begins, but the sound continues playback until it has fully faded out. New
 *   audio can be started while the fadeout is happening.
 */

import log from './log';
import Events from './events';
import { uniqueId } from './util';

const DEFAULT_VOLUME = 1.0;

const IOS = [
  'iPad Simulator',
  'iPhone Simulator',
  'iPod Simulator',
  'iPad',
  'iPhone',
  'iPod'
].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

const brokenWebkit = IOS && /OS 13_[543210]/i.test(navigator.userAgent);

const SILENCE = IOS ?
  'https://u9e9h7z5.map2.ssl.hwcdn.net/feedfm-audio/250-milliseconds-of-silence.mp3' :
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

//const SILENCE = 'https://dgase5ckewowv.cloudfront.net/feedfm-audio/1573592316-88123.m4a';

var Sound = function (speaker, options, id, url) {
  var obj = Object.assign(this, Events);

  obj.id = id;

  //url = url.replace('u9e9h7z5.map2.ssl.hwcdn.net', 's3.amazonaws.com');

  obj.url = url;
  obj.speaker = speaker;
  obj.loaded = false;

  if (options) {
    this.startPosition = +options.startPosition;
    this.endPosition = +options.endPosition;

    this.fadeInSeconds = +options.fadeInSeconds;
    if (this.fadeInSeconds) {
      this.fadeInStart = this.startPosition ? (this.startPosition / 1000) : 0;
      this.fadeInEnd = this.fadeInStart + this.fadeInSeconds;
    } else {
      this.fadeInStart = 0;
      this.fadeInEnd = 0;
    }

    this.fadeOutSeconds = +options.fadeOutSeconds;
    if (this.fadeOutSeconds) {
      if (this.endPosition) {
        this.fadeOutStart = (this.endPosition / 1000) - this.fadeOutSeconds;
        this.fadeOutEnd = this.endPosition / 1000;
      } else {
        this.fadeOutStart = 0;
        this.fadeOutEnd = 0;
      }
    }

    for (let ev of ['play', 'pause', 'finish', 'elapse']) {
      if (ev in options) {
        obj.on(ev, options[ev]);
      }
    }

    this.gain = options.gain || 0;

  } else {
    this.gain = 0;

  }

  return obj;
};

function d(audio) {
  return ' src = ' + audio.src + ', time = ' + audio.currentTime + ', paused = ' + audio.paused + ', duration = ' + audio.duration + ', readyState = ' + audio.readyState;
}

Sound.prototype = {
  play: function () {
    log('sound ' + this.id + ' play');
    return this.speaker._playSound(this);
  },

  // pause playback of the current sound clip
  pause: function () {
    log('sound ' + this.id + ' pause');
    return this.speaker._pauseSound(this);
  },

  // resume playback of the current sound clip
  resume: function () {
    log('sound ' + this.id + ' resume');
    return this.speaker._playSound(this);
  },

  // elapsed number of milliseconds played
  position: function () {
    //log(this.id + ' sound position');
    return this.speaker._position(this);
  },

  // duration in milliseconds of the song
  // (this may change until the song is full loaded)
  duration: function () {
    //log(this.id + ' sound duration');
    return this.speaker._duration(this);
  },

  // stop playing the given sound clip, unload it, and disable events
  // note that no further events will be sent from this sound
  // (so no 'finish' event, in particular)
  destroy: function (fadeOut) {
    log('sound ' + this.id + ' destroy' + (fadeOut ? ' (with fade)' : ''));
    this.speaker._destroySound(this, fadeOut);
  },

  gainAdjustedVolume: function (volume) {
    if (!this.gain) {
      return volume / 100;
    }

    var adjusted = Math.max(Math.min((volume / 100) * (50 * Math.pow(10, this.gain / 20)), 100), 0) / 100;

    //log('gain adjustment is ' + this.gain + ', and final adjusted volume is ' + adjusted);

    return adjusted;
  }

};

/**
 * Create new speaker object. Add event handling to it.
 * 
 * @returns Speaker
 */

let Speaker = function () {
  return Object.assign(this, Events);
};

// exports with this version of Javacript isn't working, so...
Speaker.IOS = IOS;
Speaker.brokenWebkit = brokenWebkit;

function createAudioContext() {
  var AudioCtor = window.AudioContext || window.webkitAudioContext;

  let desiredSampleRate = 44100;
  var context = new AudioCtor();

  // Check if hack is necessary. Only occurs in iOS6+ devices
  // and only when you first boot the iPhone, or play a audio/video
  // with a different sample rate
  if (context.sampleRate !== desiredSampleRate) {
    var buffer = context.createBuffer(1, 1, desiredSampleRate);
    var dummy = context.createBufferSource();
    dummy.buffer = buffer;
    dummy.connect(context.destination);
    dummy.start(0);
    dummy.disconnect();

    context.close(); // dispose old context
    context = new AudioCtor();
  }

  //  despite being in the moz docs, this doesn't work:
  //  if (context.state !== 'running') {
  //    throw new Error('Initial playback was not started in response to a user interaction!', context.state);
  //  }

  return context;
}

Speaker.prototype = {
  vol: 100,  // 0..100
  outstandingSounds: {}, // Sound instances that have not yet been destroyed

  audioContext: null, // for mobile safari volume adjustment

  active: null, // active audio element, sound, and gain node
  fading: null, // fading audio element, sound, and gain node
  preparing: null, // preparing audio element, sound, and gain node

  // each of the above look like:
  // {
  //   audio: an HTML Audio element (created during initializeAudio() and reused)
  //   sound: refers to Sound object whose URL has been assigned to 'audio.src' and
  //          audio.play() has successfully returned.
  //   gain: AudioGainNode for apple
  //   volume: relative volume of this sound (0..1),
  //   canplaythrough: boolean indicating if the 'canplaythrough' event has been
  //         triggered for this URL
  // }
  //
  // note that when audio.src is not SILENCE, and sound is null, we're waiting for
  // a return from audio.play(). If the audio.src is changed, or audio.pause() is called
  // before audio.play() returns, chrome will throw an error!
  //
  // When a sound is started, it is thrown into preparing.audio.src, then 'preparing' and
  // 'active' are swapped, then active.audio.play() is called.
  //
  // When a sound has completed playback or been destroyed, the sound property is set
  // to null, the audio is paused, and audio.src is set to SILENCE.

  prepareWhenReady: null, // { url, start }

  initializeAudio: function () {
    // On mobile devices, we need to kick off playback of a sound in
    // response to a user event. This does that.
    if (this.active === null) {
      log('initializing for mobile');
      try {
        throw new Error('initialize check');
      } catch (e) {
        log('initialize audio called from', e);
      }

      this.audioContext = createAudioContext();

      this.active = this._createAudio(SILENCE);
      this.fading = this._createAudio(SILENCE);

      const pwr = this.prepareWhenReady;
      if (pwr) {
        this.preparing = this._createAudio(pwr.url);
        this._prepare(pwr.url, pwr.startPosition);

      } else {
        this.preparing = this._createAudio(SILENCE);
      }


    } else {
      log('mobile already initialized');
    }
  },

  getSupportedFormats: function () {
    if (document.createElement('audio').canPlayType('audio/aac')) {
      return 'aac,mp3';
    } else {
      return 'mp3';
    }
  },

  _createAudioGainNode: function (audio) {
    var source = this.audioContext.createMediaElementSource(audio);
    var gainNode = this.audioContext.createGain();
    gainNode.gain.value = DEFAULT_VOLUME;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    return gainNode.gain;
  },

  _createAudio: function (url) {
    var DEFAULT_VOLUME = 1.0;

    var audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.loop = false;
    audio.preload = 'auto';
    audio.volume = DEFAULT_VOLUME;

    this._addEventListeners(audio);

    // apple volume adjustment
    var gain = null;
    if (Speaker.IOS && !brokenWebkit) {
      gain = this._createAudioGainNode(audio);
    }

    return {
      audio: audio,
      sound: null,
      gain: gain,
      volume: DEFAULT_VOLUME,
      canplaythrough: false
    };
  },

  _addEventListeners: function (audio) {
    audio.addEventListener('pause', this._onAudioPauseEvent.bind(this));
    audio.addEventListener('ended', this._onAudioEndedEvent.bind(this));
    audio.addEventListener('timeupdate', this._onAudioTimeUpdateEvent.bind(this));
    audio.addEventListener('canplaythrough', this._onAudioCanPlay.bind(this));
    audio.addEventListener('canplay', (event) => { log('can play!', event.currentTarget.src); });
    //this._debugAudioObject(audio);
  },

  _onAudioCanPlay: function(event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    log('can play through!', audio.src);

    if (audio === this.preparing.audio) {
      log('preparing file can play through', audio.src);

      this.preparing.canplaythrough = true;
      this.trigger('prepared', audio.src);
    }
  },

  _onAudioPauseEvent: function (event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if ((audio !== this.active.audio) || (audio.currentTime === audio.duration)) {
      return;
    }

    if (!this.active.sound || (this.active.sound.url !== audio.src)) {
      log('active audio pause, but no matching sound');
      return;
    }

    this.active.sound.trigger('pause');
  },

  _onAudioEndedEvent: function (event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if (audio === this.fading.audio) {
      audio.src = SILENCE;
      this.fading.sound = null;
      return;
    }

    if (audio !== this.active.audio) {
      return;
    }

    if (!this.active.sound || (this.active.sound.url !== audio.src)) {
      log('active audio ended, but no matching sound', audio.src);
      return;
    }

    log('active audio ended');
    var sound = this.active.sound;
    this.active.sound = null;
    sound.trigger('finish');
  },

  _onAudioTimeUpdateEvent: function (event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if ((audio === this.fading.audio) && this.fading.sound) {
      if (this.fading.sound.endPosition && (audio.currentTime >= (this.fading.sound.endPosition / 1000))) {
        this.fading.sound = null;
        this.fading.audio.src = SILENCE;

      } else {
        this._setVolume(this.fading);
      }

      return;
    }

    if (audio !== this.active.audio) {
      return;
    }

    if (!this.active.sound) {
      // got an elapse event before the play() succeeded
      return;
    }

    if (this.active.sound.url !== audio.src) {
      log('active audio elapsed, but no matching sound, so ignoring', audio.src);
      return;
    }

    if (this.active.sound.endPosition && ((this.active.sound.endPosition / 1000) <= audio.currentTime)) {
      // song reached end of play
      var sound = this.active.sound;

      this.active.sound = null;

      this.active.audio.src = SILENCE;

      sound.trigger('finish');

    } else if (this.active.sound.fadeOutEnd && (audio.currentTime >= this.active.sound.fadeOutStart)) {
      // song hit start of fade out
      this._setVolume(this.active);

      // active becomes fading, and fading becomes active
      var fading = this.fading;
      this.fading = this.active;
      this.active = fading;

      this.active.sound = null; // not used any more

      // pretend the song finished
      this.fading.sound.trigger('finish');

    } else {
      this._setVolume(this.active);

      this.active.sound.trigger('elapse');
    }

    if (this.prepareWhenReady) {
      // we've got something we want to load. check if we've loaded 
      // enough of the current song that we can start loading next song.
      this.prepare(this.prepareWhenReady.url, this.prepareWhenReady.startPosition);
    }
  },

  _setVolume: function (audioGroup, sound) {
    if (!sound) { sound = audioGroup.sound; }

    var currentTime = audioGroup.audio.currentTime;
    var currentVolume = audioGroup.volume;

    var calculatedVolume = sound.gainAdjustedVolume(this.vol);

    if ((sound.fadeInStart !== sound.fadeInEnd) && (currentTime < sound.fadeInStart)) {
      calculatedVolume = 0;

      log('pre-fade-in volume is 0');

    } else if ((sound.fadeInStart !== sound.fadeInEnd) && (currentTime >= sound.fadeInStart) && (currentTime <= sound.fadeInEnd)) {
      // ramp up from 0 - 100%
      calculatedVolume = (currentTime - sound.fadeInStart) / (sound.fadeInEnd - sound.fadeInStart) * calculatedVolume;

      log('ramping ▲ volume', { currentTime: currentTime, currentVolume: currentVolume, calculatedVolume: calculatedVolume, sound: sound });

    } else if ((sound.fadeOutStart !== sound.fadeOutEnd) && (currentTime > sound.fadeOutEnd)) {
      calculatedVolume = 0;

      log('post-fade-out volume is 0');

    } else if ((sound.fadeOutStart !== sound.fadeOutEnd) && (currentTime >= sound.fadeOutStart) && (currentTime <= sound.fadeOutEnd)) {
      // ramp down from 100% to 0
      calculatedVolume = (1 - (currentTime - sound.fadeOutStart) / (sound.fadeOutEnd - sound.fadeOutStart)) * calculatedVolume;

      log('ramping ▼ volume', { currentTime: currentTime, currentVolume: currentVolume, calculatedVolume: calculatedVolume, sound: sound });

    }

    if (currentVolume !== calculatedVolume) {
      if (Speaker.IOS) {
        if (!brokenWebkit) {
          audioGroup.gain.value = calculatedVolume;
        }
      } else {
        audioGroup.audio.volume = calculatedVolume;
      }
      audioGroup.volume = calculatedVolume;
    }
  },

  _debugAudioObject: function (object) {
    var events = ['abort', 'load', 'loadend', 'loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough', 'seeked', 'seeking', 'stalled', 'timeupdate', 'volumechange', 'waiting', 'durationchange', 'progress', 'emptied', 'ended', 'play', 'pause'];
    var speaker = this;

    for (var i = 0; i < events.length; i++) {
      object.addEventListener(events[i], function (event) {
        var audio = event.currentTarget;
        var name = (audio === speaker.active.audio) ? 'active' :
          (audio === speaker.preparing.audio) ? 'preparing' :
            'fading';

        log(name + ': ' + event.type);
        log('    active: ' + d(speaker.active.audio));
        log('    preparing: ' + d(speaker.preparing.audio));
        log('    fading: ' + d(speaker.fading.audio));

        if (audio.src === SILENCE) {
          return;
        }
      });
    }
  },

  // Create and return new sound object. This throws the song into
  // the preparing audio instance.
  create: function (url, optionsAndCallbacks) {
    var id = uniqueId('feed-play-');
    var sound = new Sound(this, optionsAndCallbacks, id, url);

    log('created play ' + id + ' (' + url + ')', optionsAndCallbacks);

    this.outstandingSounds[sound.id] = sound;

    // start loading sound, if we can
    //this.prepare(url, optionsAndCallbacks.startPosition);

    return sound;
  },

  /**
   * This function checks to see if we can prepare the given audio. 
   * If it believes we can, it calls _prepare to put the audio in the
   * prepared audio element and actually prepare it. If it doesn't 
   * believe we can, it makes a note of what we want prepared.
   * 
   * @param {string} url 
   * @param {number} startPosition?
   * @returns true if the song is already loaded up and ready to play
   */

  prepare: function (url, startPosition = 0) {
    if (!this.active || !this.active.audio) {
      log('saving url to prepare when audio is initialized', { url, startPosition });
      this.prepareWhenReady = { url, startPosition };
      return false;
    }

    var ranges = this.active.audio.buffered;
    if ((ranges.length > 0) && (ranges.end(ranges.length - 1) >= this.active.audio.duration)) {
      log('active song has loaded enough, so preparing', url);
      return this._prepare(url, startPosition);
    
    } else if (this.active.audio.src === SILENCE) {
      log('preparing over silence');
      return this._prepare(url, startPosition);
    }

    // still loading primary audio - so hold off for now
    log('still loading primary, so waiting to do active prepare', { activeUrl: this.active.audio.src });
    this.prepareWhenReady = { url, startPosition };

    return false;
  },

  /* eslint-disable no-console */
  logState: function(label) {
    // local testing:
    console.group('speaker: ' + (label || ''));

    if (!this.active) {
      console.group('active');
      console.log('uninitialized');
      console.groupEnd();

      console.group('preparing');
      console.log('uninitialized');
      console.groupEnd();

      console.group('fading');
      console.log('uninitialized');
      console.groupEnd();

    } else {
      console.group('active');
      console.log(`audio.src: ${this.active.audio.src}`);
      console.log(`audio.paused: ${this.active.audio.paused}`);
      console.log(`sound: ${this.active.sound ? this.active.sound.id : 'NULL'}`);
      console.log(`volume: ${this.active.volume}`);
      console.groupEnd();

      console.group('preparing');
      console.log(`audio.src: ${this.preparing.audio.src}`);
      console.log(`audio.paused: ${this.preparing.audio.paused}`);
      console.log(`sound: ${this.preparing.sound ? this.preparing.sound.id : 'NULL'}`);
      console.log(`volume: ${this.preparing.volume}`);
      console.groupEnd();

      console.group('fading');
      console.log(`audio.src: ${this.fading.audio.src}`);
      console.log(`audio.paused: ${this.fading.audio.paused}`);
      console.log(`sound: ${this.fading.sound ? this.fading.sound.id : 'NULL'}`);
      console.log(`volume: ${this.fading.volume}`);
      console.groupEnd();
    }

    console.group('outstanding sounds');
    for (let id in this.outstandingSounds) {
      let play = this.outstandingSounds[id];
      console.log(play.id + ': ' + play.url);
    }
    console.groupEnd();


    console.groupEnd();
  },

  /**
 * This function puts the given URL into the prepared audio element and tells
 * the browser to advance to the given start position.
 * 
 * @param {*} url 
 * @param {*} startPosition 
 * @returns true if the song is already loaded up and ready to play
 */
  _prepare: function (url, startPosition) {
    // empty out any pending request
    this.prepareWhenReady = null;

    if (!url) {
      return false;
    }

    if (this.preparing && (this.preparing.audio.src === url) && this.preparing.canplaythrough) {
      log('play already prepared!');
      // song is already prepared!
      return true;
    }

    if (this.preparing.audio.src !== url) {
      log('preparing', url);

      if (this.preparing.audio.playing) {
        this.preparing.audio.pause();
      }

      this.preparing.canplaythrough = false;
      this.preparing.audio.src = url;
    }

    if (startPosition && (this.preparing.audio.currentTime !== startPosition)) {
      log('advancing preparing audio to', startPosition / 1000);
      this.preparing.audio.currentTime = startPosition / 1000;
    }

    return false;
  },

  /*
   * Kick off playback of the requested sound.
   */

  _playSound: function (sound) {
    var speaker = this;

    if (!this.active || !this.active.audio) {
      // eslint-disable-next-line
      console.error('**** player.initializeAudio() *** not called before playback!');
      return;
    }

    if (this.active.sound === sound) {
      if (this.active.audio.paused) {
        log(sound.id + ' was paused, so resuming');

        // resume playback
        this.active.audio.play()
          .then(function () {
            log('resumed playback');
            sound.trigger('play');

          })
          .catch(function (e) {
            log('error resuming playback', e.name, e.message, e.stack, sound.id);
            speaker.active.sound = null;
            sound.trigger('finish');
          });

        if (this.fading.sound) {
          this.fading.audio.play()
            .then(function () {
              log('resumed fading playback');

            })
            .catch(function (e) {
              log('error resuming fading playback', e.name, e.message, e.stack, sound.id);
              speaker.fading.sound = null;
              speaker.fading.audio.src = SILENCE;
            });

        }

      } else {
        log(sound.id + ' is already playing');
      }

    } else {
      if (this.preparing.audio.src !== sound.url) {
        // hopefully, by this time, any sound that was destroyed before its
        // play() call completed has actually completed its play call. Otherwise
        // this will trigger an exception in the play preparation.
        this._prepare(sound.url, sound.startPosition);

        /*
              } else if (sound.startPosition && (this.preparing.audio.currentTime !== sound.startPosition)) {
                log('advancing prepared audio to', sound.startPosition / 1000);
                this.preparing.audio.currentTime = sound.startPosition / 1000;
                */
      }

      // swap prepared -> active
      var active = this.active;
      this.active = this.preparing;
      this.preparing = active;

      this.preparing.canplaythrough = false;
      this.preparing.audio.src = SILENCE;

      // don't throw sound object in active until playback starts (below)
      this.active.sound = null;
      this._setVolume(this.active, sound);

      // notify clients that whatever was previously playing has finished
      if (this.preparing.sound) {
        var finishedSound = this.preparing.sound;
        this.preparing.sound = null;
        finishedSound.trigger('finish');
      }

      log(sound.id + ' initiating play()');

      var me = this.active;

      this.active.audio.play()
        .then(function () {
          if (!speaker.outstandingSounds[sound.id]) {
            log(sound.id + ' play() succeeded, but sound has been destroyed');

            // this sound was killed before playback began - make sure to stop it
            if (me.audio && (me.audio.src === sound.url)) {
              log(sound.id + ' being paused and unloaded');
              me.audio.pause();
              me.audio.src = SILENCE;
            }

            return;
          }

          log(sound.id + ' play() succeeded');
          me.sound = sound;

          // configure fade-out now that metadata is loaded
          if (sound.fadeOutSeconds && (sound.fadeOutEnd === 0)) {
            sound.fadeOutStart = me.audio.duration - sound.fadeOutSeconds;
            sound.fadeOutEnd = me.audio.duration;
          }

          if (sound.startPosition) {
            log('updating start position');
            me.audio.currentTime = sound.startPosition / 1000;
            log('updated');
          }

          var paused = me.audio.paused;

          sound.trigger('play');

          if (me.pauseAfterPlay) {
            me.audio.pause();

          } else if (paused) {
            sound.trigger('pause');
          }

        })
        .catch(function (error) {
          log('error starting playback with sound ' + sound.id, error.name, error.message, error.stack);
          sound.trigger('finish', error);
        });
    }
  },

  _destroySound: function (sound, fadeOut = false) {
    sound.off();

    if (this.active && (this.active.sound === sound)) {

      if (!fadeOut || !sound.fadeOutSeconds) {
        log('destroy triggered for current sound (no fadeout)', sound.id);
        this.active.audio.pause();
        this.active.audio.src = SILENCE;

      } else {
        log('destroy triggered for current sound (with fadeout)', sound.id);

        let audio = this.active.audio;
        sound.fadeOutStart = audio.currentTime;

        if (sound.endPosition) {
          sound.fadeOutEnd = Math.min(audio.currentTime + sound.fadeOutSeconds, sound.endPosition / 1000);
          sound.endPosition = Math.min(sound.fadeOutEnd * 1000, sound.endPosition);
  
        } else {
          sound.fadeOutEnd = audio.currentTime + sound.fadeOutSeconds;
          sound.endPosition = sound.fadeOutEnd * 1000;
        }
        
        // song hit start of fade out
        this._setVolume(this.active);

        // active becomes fading, and fading becomes active
        var fading = this.fading;
        this.fading = this.active;
        this.active = fading;

        this.active.sound = null; // not used any more 
      }

    } else {
      log('destroy triggered for inactive sound', sound.id);

      // if (this.active && (this.active.audio.src === sound.url)) {
      //   We're destroying the active sound, but it hasn't completed its play()
      //   yet (indicated by this.active.sound === sound), so we can't pause it
      //   here. When the play does complete, it will notice it isn't in the 
      //   outstandingSounds map and it will pause itself
      // }
    }

    delete this.outstandingSounds[sound.id];
  },

  flush: function() {
    // destroy all outstanding sound objects
    for (let id in this.outstandingSounds) {
      this.outstandingSounds[id].destroy();
    }
  },

  _pauseSound: function (sound) {
    if (this.active && (sound.url === this.active.audio.src)) {
      if (this.active.sound === sound) {
        this.active.audio.pause();
      } else {
        // if active.sound isn't assigned, then the song is still being loaded.
        // if we try to pause() right now, it will cause the play() to throw an
        // exception... so just throw up a flag for this
        this.active.pauseAfterPlay = true;
      }
    }

    if (this.fading && this.fading.audio) {
      this.fading.audio.pause();
    }
  },

  _position: function (sound) {
    if (this.active && (sound === this.active.sound)) {
      if (sound.url !== this.active.audio.src) {
        log('trying to get current song position, but it is not in the active audio player');
      }

      return Math.floor(this.active.audio.currentTime * 1000);

    } else {
      return 0;

    }
  },

  _duration: function (sound) {
    if (sound === this.active.sound) {
      if (sound.url !== this.active.audio.src) {
        log('trying to get current song duration, but it is not in the active audio player');
      }
      var d = this.active.audio.duration;
      return isNaN(d) ? 0 : Math.floor(d * 1000);

    } else {
      return 0;

    }
  },

  // set the volume (0-100)
  setVolume: function (value) {
    if (typeof value !== 'undefined') {
      this.vol = value;

      if (this.active && this.active.sound) {
        this._setVolume(this.active);
      }

      this.trigger('volume', value);
    }

    return this.vol;
  },

  getVolume: function() {
    return this.vol;
  }

};

// add events to speaker class
Object.assign(Speaker.prototype, Events);

export default Speaker;
