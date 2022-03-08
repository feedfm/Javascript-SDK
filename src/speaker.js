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

import Events from './events';
import hasBlobSupport from './blob-support';
import log from './log';
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

const CHROMECAST = navigator.userAgent.includes('CrKey');

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

  obj.savedSrc = '';
  obj.savedPos = 0;

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

let Speaker = function (options) {
  if (options && options.maxRetries) {
    this.maxRetries = options.maxRetries;
  }

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

  responses: null, // array of response headers from preloading

  maxRetries: 10, // max number of times to retry preloading a song
  
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

  // If the browser supports URL.objectToURL(), we try to load audio with fetch and
  // then pass the blob URL to the audio element.
  preloaded: null, 

  /*
  { 
    url,             // url we are trying to load manually (will not be null)
    blobUrl: null  // blob url for URL above, or null if not loaded yet
  },
  */

  // Fallback for preloading if the browser does not support URL.objectToURL()
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

      if (!CHROMECAST){
        this.fading = this._createAudio(SILENCE);
        this.preparing = this._createAudio(this.prepareWhenReady ? this.prepareWhenReady : SILENCE);
      }

      this.audioContext = createAudioContext();

      this.active = this._createAudio(SILENCE);

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
      return 'mp3,aac';
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
    audio.addEventListener('error', this._onAudioErroredEvent.bind(this));
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
      this.trigger('prepared', audio.src, true);
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

    if (!this.active.sound) {
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

    if (!CHROMECAST && (audio === this.fading.audio)) {
      revoke(audio);
      audio.src = SILENCE;
      this.fading.sound = null;
      return;
    }

    if (audio !== this.active.audio) {
      return;
    }

    if (!this.active.sound) {
      log('active audio ended, but no matching sound', audio.src);
      return;
    }

    log('active audio ended');
    var sound = this.active.sound;
    this.active.sound = null;
    sound.trigger('finish');
  },

  _onAudioErroredEvent: function (event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if (audio === this.fading.audio) {
      revoke(audio);
      audio.src = SILENCE;
      this.fading.sound = null;
      return;
    }

    if (audio !== this.active.audio) {
      return;
    }

    if (!this.active.sound) {
      log('active audio errored, but no matching sound', audio.src);
      return;
    }

    log('active audio errored', event.error);
    var sound = this.active.sound;
    this.active.sound = null;
    sound.trigger('finish', event.error);
  },

  _onAudioTimeUpdateEvent: function (event) {
    var audio = event.currentTarget;

    if (audio.src === SILENCE) {
      return;
    }

    if (!CHROMECAST && audio === this.fading.audio && this.fading.sound) {
      if (this.fading.sound.endPosition && (audio.currentTime >= (this.fading.sound.endPosition / 1000))) {
        this.fading.sound = null;
        revoke(this.fading.audio);
        this.fading.audio.src = SILENCE;

      } else {
        this._setVolume(this.fading);
      }

      return;
    }

    if (audio !== this.active.audio) {
      return;
    }

    if (!this.active.sound || this.active.sound.awaitingPlayResponse) {
      // got an elapse event before the play() succeeded
      return;
    }

    if (this.active.sound.endPosition && ((this.active.sound.endPosition / 1000) <= audio.currentTime)) {
      // song reached end of play
      var sound = this.active.sound;

      this.active.sound = null;
      revoke(this.active.audio);
      this.active.audio.src = SILENCE;
      sound.trigger('finish');

    } else if (!CHROMECAST && this.active.sound.fadeOutEnd && (audio.currentTime >= this.active.sound.fadeOutStart)) {
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
    var events = ['abort', 'load', 'loadend', 'loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough', 'seeked', 'seeking', 'stalled', 'timeupdate', 'volumechange', 'waiting', 'durationchange', 'progress', 'emptied', 'ended', 'play', 'pause', 'error'];
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
    if (!this.active || !this.active.audio) {
      log('no audio prepared yet, so preparing when ready');
      this.prepareWhenReady = sound.url;

    } else if (CHROMECAST || this.preparing.audio.src === SILENCE) {
      log('preparing sound now');
      this._prepare(sound.url, sound.startPosition);
    }

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
      if (hasBlobSupport()) {
        log('pre-loading audio', { url });
        return this._preload(url);

      } else {
        log('saving url to prepare when audio is initialized', { url, startPosition });
        this.prepareWhenReady = { url, startPosition };
        return false;

      }
    }

    var ranges = this.active.audio.buffered;
 

    var range = (ranges.length > 0) && ranges.end(ranges.length - 1);
    if (!CHROMECAST && (ranges.length > 0) && (ranges.end(ranges.length - 1) >= this.active.audio.duration)) {
      log('active song has loaded enough, so preparing', url);
      if (hasBlobSupport()) {
        return this._preload(url);
      } else {
        return this._prepare(url, startPosition);
      }
    
    } else if (this.active.audio.src === SILENCE) {
      log('preparing over silence');
      if (hasBlobSupport()) {
        return this._preload(url);
      } else {
        return this._prepare(url, startPosition);
      }
    }

    // still loading primary audio - so hold off for now

    log('still loading primary, so waiting to do active prepare', { activeUrl: this.active.audio.src, range });
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
   * This function tries to fetch the given URL and convert it
   * into a blob url. If the URL is already loaded up, this
   * returns true.
   * 
   * @param {string} url url to load into memory
   * @returns true if the url is already loaded up
   **/

  _preload: function(url) {
    log('preloading!');
    
    this.prepareWhenReady = null;

    if (this.preloaded) {
      if (this.preloaded.url === url) {
        // true when already loaded up
        const preloaded = !!this.preloaded.blobUrl;

        log('preloading', { url, preloaded });
        
        return preloaded;
      }

      if (this.preloaded.blobUrl) {
        log('revoking previously loaded url', { url: this.preloaded.url });

        // unload previous blob
        URL.revokeObjectURL(this.preloaded.blobUrl);
        this.preloaded = null;
      }
    }

    this.preloaded = {
      url,
      blobUrl: null,
      responses: []
    };
    
    this._fetch(url, this.preloaded.responses);

    return false;
  },

  _fetch: function(url, responses, attempt = 1) {
    log(`preload attempt #${attempt}`, { url });

    const response = { start: new Date().toString() };
    responses.push(response);

    const retry = () => {
      if (!this.preloaded || (this.preloaded.url !== url)) {
        log('preload abandoning retry because we have moved on', { url });
        return;
      }

      if (attempt > this.maxRetries) {
        log('preload failed to fetch', { url, responses });
        this.preloaded = null;
        this.trigger('prepared', url, false, responses);
        return;
      } 
    
      setTimeout(() => this._fetch(url, responses, attempt + 1), Math.min(Math.pow(10, attempt), 10000));
    };
    
    log('preloading', { url, responses });
  
    // stress test:
    // const extra = (Math.random() < 0.7) ? '-extrajunkj' : '';

    fetch(url  /* + extra */)
      .then((res) => {
        log('preload got response');
        response.end = new Date().toString();
        response.status = res.status;
        response.text = res.statusText;
        response.headers = [ ...res.headers.entries() ];
                  
        // if res.type == 'opaque', could cause problems
        if (res.type === 'opaque') {
          log('preload opaque response, so retrying');
          response.name = 'OpaqueResponse';
          response.message = 'Browser returned oaque response';
          retry();
          return;
        }
        
        if (!res.ok) {
          log('preload fetch error - retrying');
          retry();
          return;
        }

        res
          .blob()
          .then((blob) => {
            log('preload got blob');
            
            if (this.preloaded && (this.preloaded.url === url)) {
              log('preloaded', { url });
              const properMimeTypeBlob = new Blob([ blob ], { type: 'audio/mpeg' });
              this.preloaded.blobUrl = URL.createObjectURL(properMimeTypeBlob);
          
              this.trigger('prepared', url, true, responses);
  
            } else {
              // finished retrieving file, but nobody cares any more
              log('preload retrieved url, but nobody cares any more');
            }
          })
          .catch((err) => {
            log('preload error blobbing', err, err.name, err.message);

            response.name = err.name;
            response.message = err.message;

            retry();
          });
      })
      .catch((err) => {
        log('preload error', err, err.name, err.message);

        // connectivity error 
        response.end = new Date().toString();
        response.name = err.name;
        response.message = err.message;
        
        retry();
      });
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

    if (CHROMECAST){ 
      log('preparing ' + url);

      if (this.active.audio.playing) {
        this.active.audio.pause();
      }

      this.active.audio.src = url;
    } 
    else if (this.preparing.audio.src !== url) {
      log('preparing ' + url);

      if (this.preparing.audio.playing) {
        this.preparing.audio.pause();
      }

      this.preparing.canplaythrough = false;

      revoke(this.preparing.audio);
      this.preparing.audio.src = url;
    }

    if (CHROMECAST && (startPosition && this.active.audio.currentTime !== startPosition)) {
      log('advancing preparing audio to', startPosition / 1000);
      this.active.audio.currentTime = startPosition / 1000;
    }
    else if (startPosition && (this.preparing.audio.currentTime !== startPosition)) {
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
      if (this.active.audio.paused || this.active.audio.src === 'not-a-real-file-paused' ) {
        log(sound.id + ' was paused, so resuming');
        if (CHROMECAST)
        {
          this.active.audio.currentTime = sound.savedPos;
          this.active.audio.src = sound.savedSrc;
        }
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

        if (!CHROMECAST && this.fading.sound) {
          this.fading.audio.play()
            .then(function () {
              log('resumed fading playback');

            })
            .catch(function (e) {
              log('error resuming fading playback', e.name, e.message, e.stack, sound.id);
              speaker.fading.sound = null;        
              revoke(speaker.fading.audio);
              speaker.fading.audio.src = SILENCE;
            });

        }

      } else {
        log(sound.id + ' is already playing');
      }

      return;
    } 
    
    if (!CHROMECAST && this.preloaded && (this.preloaded.url === sound.url) && this.preloaded.blobUrl) {
      log(sound.id + ' using preloaded audio', this.preloaded);
      
      if (this.preparing.audio.playing) {
        this.preparing.audio.pause();
      }
      
      sound.responses = this.preloaded.responses;

      revoke(this.preparing.audio);
      this.preparing.audio.src = this.preloaded.blobUrl;
      this.preparing.canplaythrough = true;
      this.preloaded = null;

    } else if (this.preparing.audio.src !== sound.url) {
      // hopefully, by this time, any sound that was destroyed before its
      // play() call completed has actually completed its play call. Otherwise
      // this will trigger an exception in the play preparation.
      this._prepare(sound.url, sound.startPosition);

    }

    // swap prepared -> active
    var active = this.active;
    if (!CHROMECAST){
      this.active = this.preparing;
      this.preparing = active; // don't throw sound object in active until playback starts (below)
    }

      // notify clients that whatever was previously playing has finished
      if (!CHROMECAST && this.preparing.sound) {
        this.preparing.audio.src = SILENCE;

        var finishedSound = this.preparing.sound;
        this.preparing.sound = null;
        finishedSound.trigger('finish');
      }
    this.preparing.canplaythrough = false;

    revoke(this.preparing.audio);
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

    sound.awaitingPlayResponse = true;
    this.active.sound = sound;

    var me = this.active;

    var attempt = 1;
    
    const play = () => {
      log(sound.id + ' initiating play()', { attempt });

      this.active.audio.play()
        .then(function () {
          delete sound.awaitingPlayResponse;
        
          if (!speaker.outstandingSounds[sound.id]) {
            log(sound.id + ' play() succeeded, but sound has been destroyed');

            // this sound was killed before playback began - make sure to stop it
            if (me.audio && (me.audio.src === sound.url)) {
              log(sound.id + ' being paused and unloaded');
              me.audio.pause();

              revoke(me.audio);
              me.audio.src = SILENCE;
            }

            return;
          }

          log(sound.id + ' play() succeeded');
        
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
          log('error starting playback with sound ' + sound.id, { name: error.name, message: error.message, attempt });

          if (attempt < 4) {
            attempt++;
            setTimeout(play, 10);
          } else {
            sound.trigger('finish', error);            
          }
        });
    };

    play();
    
  },

  _destroySound: function (sound, fadeOut = false) {
    sound.off();

    if (this.active && (this.active.sound === sound)) {

      if (!fadeOut || !sound.fadeOutSeconds) {
        log('destroy triggered for current sound (no fadeout)', sound.id);
        this.active.audio.pause();

        revoke(this.active.audio);
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
        if (!CHROMECAST)
        {        
          var fading = this.fading;
          this.fading = this.active;
          this.active = fading;
          this.active.sound = null;
        } // not used any more 
      }

    } else {
      log('destroy triggered for inactive sound', sound.id);

      // if (this.active && (this.active.audio.sound === sound)) {
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
        if (CHROMECAST)
        {
          sound.savedPos = this.active.audio.currentTime;
          sound.savedSrc =this.active.audio.src;
          this.active.audio.src = 'not-a-real-file-paused';
        }
        else
        {
          this.active.audio.pause();
        }

        // 
      } else {
        // if active.sound isn't assigned, then the song is still being loaded.
        // if we try to pause() right now, it will cause the play() to throw an
        // exception... so just throw up a flag for this
        this.active.pauseAfterPlay = true;
      } 
      this.active.audio.pause();
      
    }

    if (!CHROMECAST && this.fading && this.fading.audio) {
      this.fading.audio.pause();
    }
  },

  _position: function (sound) {
    if (this.active && (sound === this.active.sound)) {
      return Math.floor(this.active.audio.currentTime * 1000);

    } else {
      return 0;

    }
  },

  _duration: function (sound) {
    if (sound === this.active.sound) {
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

function revoke(audio) {
  if (audio.src.slice(0, 4) === 'blob') {
    log('revoking', { url: audio.src });
    URL.revokeObjectURL(audio.src);
  }
}

// add events to speaker class
Object.assign(Speaker.prototype, Events);

export default Speaker;
