/*
 * The speaker object encapsulates the SoundManager2 code and boils it down
 * to the following api:
 *
 *    speaker().initializeAudio(): many clients can only start using
 *      speaker when handling an 'onClick' event. This call should be made 
 *      at that time to get audio initialized while waiting for details
 *      of what to play from the server. 
 *
 *    speaker().setVolume(value): set the volume from 0 (mute) - 100 (full volume)
 *
 *    var sound = speaker().create(url, optionsAndEvents): create a new sound from the
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
 * This module returns a function that returns a speaker singleton so everybody
 * is using the same instance.
 *
 * Proper usage looks like this:
 *
 *   require([ 'feed/speaker' ], function(speaker) {
 *     var mySpeaker = speaker(options, onReady);
 *   });
 *
 * That will make sure that all code uses the same speaker instance. 'options'
 * is optional, and is an object with any of the following keys:
 *
 *   debug: if true, emit debug information to the console
 *
 * The first function call to 'speaker()' is what configures and defines the
 * speaker - and subsequent calls just return the already-created instance.
 * I think this is a poor interface, but I don't have a better one at the
 * moment.
 *
 */

import log from './log';
import Events from './events';
import { uniqueId } from './util';

const iOSp = /(iPhone|iPad)/i.test(navigator.userAgent);

const SILENCE = iOSp ?
  'https://u9e9h7z5.map2.ssl.hwcdn.net/feedfm-audio/250-milliseconds-of-silence.mp3' :
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

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
    log(this.id + ' sound play');
    return this.speaker._playSound(this);
  },

  // pause playback of the current sound clip
  pause: function () {
    log(this.id + ' sound pause');
    return this.speaker._pauseSound(this);
  },

  // resume playback of the current sound clip
  resume: function () {
    log(this.id + ' sound resume');
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
  destroy: function () {
    log(this.id + ' being called to destroy');
    this.speaker._destroySound(this);
  },

  gainAdjustedVolume: function (volume) {
    if (!this.gain) {
      log('no volume adjustment');
      return volume / 100;
    }

    var adjusted = Math.max(Math.min((volume / 100) * (50 * Math.pow(10, this.gain / 20)), 100), 0) / 100;

    //log('gain adjustment is ' + this.gain + ', and final adjusted volume is ' + adjusted);

    return adjusted;
  }

};

var Speaker = function () {

};

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

  return context;
}

Speaker.prototype = {
  vol: 100,  // 0..100
  outstandingPlays: {},

  audioContext: null, // for mobile safari

  active: null, // active audio element, sound, and gain node
  fading: null, // fading audio element, sound, and gain node
  preparing: null, // preparing audio element, sound, and gain node

  prepareWhenReady: null, // url to prepare when active player is fully loaded

  initializeAudio: function () {
    // On mobile devices, we need to kick off playback of a sound in
    // response to a user event. This does that.
    if (this.active === null) {
      log('initializing for mobile');

      this.audioContext = createAudioContext();

      this.active = this._createAudio(SILENCE);
      this.fading = this._createAudio(SILENCE);
      this.preparing = this._createAudio(this.prepareWhenReady ? this.prepareWhenReady : SILENCE);

      this.prepareWhenReady = null;

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
    gainNode.gain.value = 1.0;

    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    return gainNode.gain;
  },

  _createAudio: function (url) {
    var DEFAULT_VOLUME = 1.0;

    var audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.loop = false;
    audio.volume = DEFAULT_VOLUME;

    this._addEventListeners(audio);

    // iOS volume adjustment
    var gain = null;
    if (iOSp) {
      var source = this.audioContext.createMediaElementSource(audio);
      var gainNode = this.audioContext.createGain();
      gainNode.gain.value = DEFAULT_VOLUME;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      gain = gainNode.gain;
    }

    return {
      audio: audio,
      sound: null,
      gain: gain,
      volume: DEFAULT_VOLUME
    };
  },

  _addEventListeners: function (audio) {
    audio.addEventListener('pause', this._onAudioPauseEvent.bind(this));
    audio.addEventListener('ended', this._onAudioEndedEvent.bind(this));
    audio.addEventListener('timeupdate', this._onAudioTimeUpdateEvent.bind(this));
    //this._debugAudioObject(audio);
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

    if (!this.active.sound || (this.active.sound.url !== audio.src)) {
      log('active audio elapsed, but it no matching sound');
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
      this.prepare(this.prepareWhenReady);
    }
  },

  _setVolume: function (audioGroup, sound) {
    if (!sound) { sound = audioGroup.sound; }

    var currentTime = audioGroup.audio.currentTime;
    var currentVolume = audioGroup.volume;

    var calculatedVolume = sound.gainAdjustedVolume(this.vol);

    if ((sound.fadeInStart != sound.fadeInEnd) && (currentTime < sound.fadeInStart)) {
      calculatedVolume = 0;

      log('pre-fade-in volume is 0');

    } else if ((sound.fadeInStart != sound.fadeInEnd) && (currentTime >= sound.fadeInStart) && (currentTime <= sound.fadeInEnd)) {
      // ramp up from 0 - 100%
      calculatedVolume = (currentTime - sound.fadeInStart) / (sound.fadeInEnd - sound.fadeInStart) * calculatedVolume;

      log('ramping ▲ volume', { currentTime: currentTime, currentVolume: currentVolume, calculatedVolume: calculatedVolume, sound: sound });

    } else if ((sound.fadeOutStart != sound.fadeOutEnd) && (currentTime > sound.fadeOutEnd)) {
      calculatedVolume = 0;

      log('post-fade-out volume is 0');

    } else if ((sound.fadeOutStart != sound.fadeOutEnd) && (currentTime >= sound.fadeOutStart) && (currentTime <= sound.fadeOutEnd)) {
      // ramp down from 100% to 0
      calculatedVolume = (1 - (currentTime - sound.fadeOutStart) / (sound.fadeOutEnd - sound.fadeOutStart)) * calculatedVolume;

      log('ramping ▼ volume', { currentTime: currentTime, currentVolume: currentVolume, calculatedVolume: calculatedVolume, sound: sound });

    }

    if (currentVolume != calculatedVolume) {
      if (iOSp) {
        audioGroup.gain.value = calculatedVolume;
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

    this.outstandingPlays[sound.id] = sound;

    // start loading sound, if we can
    if (!this.active.audio) {
      this.prepareWhenReady = sound.url;
    } else {
      this._prepare(sound.url, sound.startPosition);
    }

    return sound;
  },

  prepare: function (url) {
    if (!this.active.audio) {
      this.prepareWhenReady = url;
      return;
    }

    var ranges = this.active.audio.buffered;
    if ((ranges.length > 0) && (ranges.end(ranges.length - 1) >= this.active.audio.duration)) {
      return this._prepare(url, 0);
    }

    if (this.active.audio.url === SILENCE) {
      return this._prepare(url, 0);
    }

    // still loading primary audio - so hold off for now
    this.prepareWhenReady = url;
  },

  _prepare: function (url, startPosition) {
    // empty out any pending request
    this.prepareWhenReady = null;

    if (this.preparing.audio.src !== url) {
      log('preparing ' + url);
      this.preparing.audio.src = url;
    }

    if (startPosition && (this.preparing.audio.currentTime !== startPosition)) {
      log('advancing preparing audio to', startPosition / 1000);
      this.preparing.audio.currentTime = startPosition / 1000;
    }
  },

  /*
   * Kick off playback of the requested sound.
   */

  _playSound: function (sound) {
    var speaker = this;

    if (!this.active.audio) {
      console.error('**** player.initializeAudio() *** not called');
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
          .catch(function () {
            log('error resuming playback');
            speaker.active.sound = null;
            sound.trigger('finish');
          });

        if (this.fading.sound) {
          this.fading.audio.play()
            .then(function () {
              log('resumed fading playback');

            })
            .catch(function () {
              log('error resuming fading playback');
              speaker.fading.sound = null;
              speaker.fading.audio.src = SILENCE;
            });

        }

      } else {
        log(sound.id + ' is already playing');
      }

    } else {
      if (this.preparing.audio.src !== sound.url) {
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

      // don't throw sound object in active until playback starts (below)
      this.active.sound = null;
      this._setVolume(this.active, sound);

      // reset audio element for finished song
      this.preparing.audio.src = SILENCE;

      // notify clients that whatever was previously playing has finished
      if (this.preparing.sound) {
        var finishedSound = this.preparing.sound;
        this.preparing.sound = null;
        finishedSound.trigger('finish');
      }

      log(sound.id + ' starting');
      this.active.audio.play()
        .then(function () {
          log('success starting playback');
          speaker.active.sound = sound;

          // configure fade-out now that metadata is loaded
          if (sound.fadeOutSeconds && (sound.fadeOutEnd === 0)) {
            sound.fadeOutStart = speaker.active.audio.duration - sound.fadeOutSeconds;
            sound.fadeOutEnd = speaker.active.audio.duration;
          }

          if (sound.startPosition) {
            log('updating start position');
            speaker.active.audio.currentTime = sound.startPosition / 1000;
            log('updated');
          }

          var paused = speaker.active.audio.paused;

          sound.trigger('play');

          if (paused) {
            sound.trigger('pause');
          }

        })
        .catch(function (error) {
          log('error starting playback', error);
          sound.trigger('finish', error);
        });
    }
  },

  _destroySound: function (sound) {
    log('want to destroy, and current is', sound, this.active.sound);
    sound.off();

    if (this.active.sound === sound) {
      log('destroy triggered for current sound', sound.id);
      this.active.audio.pause();
    }

    delete this.outstandingPlays[this.id];
  },

  _pauseSound: function (sound) {
    if ((sound != null) && (sound !== this.active.sound)) {
      return;
    }

    this.active.audio.pause();

    if (this.fading.sound) {
      this.fading.audio.pause();
    }
  },

  _position: function (sound) {
    if (sound === this.active.sound) {
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
  }

};

// add events to speaker class
Object.assign(Speaker.prototype, Events);

export default Speaker;
